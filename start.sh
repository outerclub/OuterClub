#!/bin/bash
rm -f *.log
nohup python main.py > main.log &
nohup python rtg.py > rtg.log &
