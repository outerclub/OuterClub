#!/bin/bash
mkdir -p logs
rm -f logs/*.log logs/*.err
nohup python -u rtg.py > logs/rtg.log &
nohup python -u main.py >logs/main.log &
