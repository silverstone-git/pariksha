import json
import re
from typing import Callable
from smolagents.default_tools import VisitWebpageTool
from smolagents import ToolCallingAgent, ActionStep
from smolagents.tools import Tool

from pptgen.models.inference_models import ModelProvider
from pptgen.utils.inference import initialize_model
from pptgen.utils.search import brave_search_tool


class StatefulSmolAgent:
    def __init__(
        self,
        external_tools: list[Callable],
        allow_web_search: bool = False,
        state: dict = {},
        system_prompt: str | None = None,
        model_provider: ModelProvider = 'gemini',
        model_id='gemini-3-flash-preview',
        api_key: str | None= None,
    ):
        self.state = state
        alltools = []
        if allow_web_search:
            alltools.extend([
                brave_search_tool,
                VisitWebpageTool(),
            ])
        alltools.extend(external_tools)
        self.model = initialize_model(model_provider, model_id, api_key)
        if system_prompt is not None:
            self.agent = ToolCallingAgent(
                    tools=alltools,
                    model=self.model,
                    add_base_tools=False,
                    state= state,
                    instructions=system_prompt
            )
        else:
            self.agent = ToolCallingAgent(
                    tools=alltools,
                    model=self.model,
                    add_base_tools=False,
                    instructions=system_prompt
            )
    
    

    def run(self, prompt):
        """
        Returns a dict with 'return_code' (0/1/2 for success/error/not_json_data) 
        and 'data' (the output of the prompt, json or string)
        """
        res = self.agent.run(prompt)
        final_answer_content = ''
        last_step = self.agent.memory.steps[-1]
        if isinstance(last_step, ActionStep) and last_step.tool_calls and last_step.tool_calls[-1].name == "final_answer":
            final_answer_content = str(res)
        if not final_answer_content:
            final_answer_content = res if isinstance(res, str) else '{"status": "error", "data": "Agent did not provide a final answer in the expected format."}'
        
        # Clean JSON that might be in a markdown block
        cleaned_response = re.sub(r'```json\s*|\s*```', '', final_answer_content).strip()
        try:
            final_answer_obj = json.loads(cleaned_response)
            return {'return_code': 0, 'data': final_answer_obj}
        except:
            return {'return_code': 2, 'data': cleaned_response}


if __name__ == '__main__':


    calc_key= 'calc'
    class MultiplyNumbersTool(Tool):
        name = "multiply_numbers"
        description = "Multiplication tool which multiplies a and b and stores result in calculator state"
        inputs = {
            "a": {"type": "integer", "description": "the first number which is to be multipled"}, 
            "b": {"type": "integer", "description": "the second number which is to be multipled"}
        }
        output_type = "string"

        def __init__(self, state):
            super().__init__()
            self.state = state

        def forward(self, a: int, b: int) -> str:
            self.state[calc_key] *= a * b
            return 'calc'

    class GetCurrentState(Tool):
        name = "get_current_state"
        description = "Fetches Value of the given key"
        inputs = {
            "key": {"type": "string", "description": "the key for which the value is to be retrieved"}
        }
        output_type = "any"

        def __init__(self, state):
            super().__init__()
            self.state = state

        def forward(self, key: str) -> any:
            try:
                val = self.state.get(key, -1)
                return val
            except Exception as e:
                print(str(e))
                return 1


    state= {calc_key: 1}
    agent = StatefulSmolAgent(
        external_tools=[MultiplyNumbersTool(state), GetCurrentState(state)],
        allow_web_search=False,
        state= state,
        system_prompt= None
    )
    res= agent.run("how many apples does john have to buy if he has 305 customers and each customer requires 34929342 apples")
    print(res['data'])
