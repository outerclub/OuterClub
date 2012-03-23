#!/bin/bash
mkdir -p logs
rm -f logs/*.log logs/*.err
rm -f oc/server/static/upload/*
nohup python -u rtg.py > logs/rtg.log &
nohup python -u main.py >logs/main.log &
