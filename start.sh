#!/bin/bash
mkdir -p logs
rm -f logs/*.log
nohup python main.py > logs/main.log &
nohup python rtg.py > logs/rtg.log &
