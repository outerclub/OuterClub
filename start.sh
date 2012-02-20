#!/bin/bash
mkdir -p logs
rm -f logs/*.log logs/*.err
kill `ps aux | grep rtg.py | awk '{print $2}'` 2>/dev/null
kill `ps aux | grep main.py | awk '{print $2}'` 2>/dev/null
python rtg.py&
python main.py&
