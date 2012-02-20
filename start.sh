#!/bin/bash
mkdir -p logs
rm -f logs/*.log logs/*.err
kill `ps aux | grep rtg.py | awk '{print $2}'` 2>/dev/null
kill `ps aux | grep main.py | awk '{print $2}'` 2>/dev/null
nohup python -u rtg.py 1>logs/rtg.log 2>logs/rtg.err&
nohup python -u main.py 1>logs/main.log 2>logs/main.err&
