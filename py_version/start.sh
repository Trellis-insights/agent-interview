#!/bin/bash

# Create a new tmux session named 'temporal-agent'
tmux new-session -d -s temporal-agent

# Window 0: FastAPI app
tmux rename-window -t temporal-agent:0 'fastapi'
tmux send-keys -t temporal-agent:0 'poetry run python main.py' C-m

# Window 1: Temporal server
tmux new-window -t temporal-agent:1 -n 'temporal-server'
tmux send-keys -t temporal-agent:1 'temporal server start-dev' C-m

# Window 2: Temporal worker
tmux new-window -t temporal-agent:2 -n 'temporal-worker'
tmux send-keys -t temporal-agent:2 'poetry run python -m temporal.worker' C-m

# Switch to the first window
tmux select-window -t temporal-agent:0

# Attach to the session
tmux attach-session -t temporal-agent