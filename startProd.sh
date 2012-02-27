#!/bin/bash
mkdir -p logs
rm -f logs/*.log logs/*.err
kill `ps aux | grep rtg.py | awk '{print $2}'` 2>/dev/null
kill `ps aux | grep main.py | awk '{print $2}'` 2>/dev/null
nohup python -u rtg.py > logs/rtg.log &
nohup python -u main.py >logs/main.log &
