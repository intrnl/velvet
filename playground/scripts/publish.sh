#!/usr/bin/env bash

if [[ -n $(git status --porcelain) ]]; then
	echo 'Working directory is not clean'
	git status --short
	exit 1
fi

GIT_COMMIT=$(git rev-parse HEAD)

rsync -aHAX --delete --exclude=.git dist/ deploy/
git -C deploy/ add .
git -C deploy/ commit -m "deploy: ${GIT_COMMIT}"
git -C deploy/ push
