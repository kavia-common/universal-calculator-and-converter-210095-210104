#!/bin/bash
cd /home/kavia/workspace/code-generation/universal-calculator-and-converter-210095-210104/calculator_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

