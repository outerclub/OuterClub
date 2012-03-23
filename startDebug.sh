#!/bin/bash
kill `ps aux | grep rtg.py | awk '{print $2}'` 2>/dev/null
kill `ps aux | grep main.py | awk '{print $2}'` 2>/dev/null
rm -f oc/server/static/upload/*
python -u rtg.py &
python -u main.py &
