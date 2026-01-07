#!/bin/bash

# Read JSON input from stdin
input=$(cat)

# Extract current directory
current_dir=$(echo "$input" | jq -r '.workspace.current_dir')

# Replace home directory with ~
display_dir="${current_dir/#$HOME/~}"

# Get git branch if in a git repo
git_info=""
if git -C "$current_dir" rev-parse --git-dir > /dev/null 2>&1; then
    branch=$(git -C "$current_dir" branch --show-current 2>/dev/null)
    if [ -n "$branch" ]; then
        git_info=$(printf " \033[33m‹%s›\033[0m" "$branch")
    fi
fi

# Just show folder and branch
printf "\033[34m%s\033[0m%s" "$display_dir" "$git_info"
