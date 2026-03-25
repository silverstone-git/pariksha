source ~/dev/pariksha/cli/venv_pariksha/bin/activate

python ~/dev/pariksha/cli/exam_generator.py --name "Thermodynamics: Free Energy and the main Quantities 20 Medium" --description "GATE level conceptual questions for thermodynamics, topics include: free energy, calculation of thermodynamic quantities"   --questions 20 --model "gemini-3-pro-preview" --difficulty intermediate

python ~/dev/pariksha/cli/exam_generator.py --name "Quantum Stat Mech 15 Hard" --description "GATE level questions for Quantum Statistical Mechanics, topics include: Fermions, Bosons, Quantum - Classical correspondence, Degenerate Fermi Gas, Planck distribution law"   --questions 15 --model "gemini-3-pro-preview" --difficulty hard

python ~/dev/pariksha/cli/exam_generator.py --name "Radiation Thermodynamics and BEC 20 Hard" --description "GATE level questions for Black Body Radiation, Ideal Bose Gas, Bose Einstein Condensation"   --questions 20 --model "gemini-3-pro-preview" --difficulty hard

python ~/dev/pariksha/cli/exam_generator.py --name "Thermodynamics: Phase and Criticality 15 Medium" --description "GATE level questions for First and Second order phase transitions, phase equilibria, critical points"   --questions 15 --model "gemini-3-pro-preview" --difficulty intermediate



