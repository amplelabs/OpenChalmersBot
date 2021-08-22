#!/bin/bash
# DEPLOYMENT SCRIPT
# Author: alex.zvaniga@amplelabs.co 

# Set default stage - Yaml files currently configured for testing
stage=""
# Manage params
while [ "$1" != "" ]; do
    case $1 in
    -s | --stage)
        shift
        stage=$1
        ;;
    *)
        usage
        exit 1
        ;;
    esac
    shift
done
# If stage is empty
# find all folder paths within ./services - go only one level deep - cd to returned path, and run sls deploy
if [[ -z "$stage" ]]; then
    find ./services/* -maxdepth 0 -type d \( ! -name . \) -exec bash -c "cd '{}' && sls deploy --org ample --app open-chalmers" \;
else
    find ./services/* -maxdepth 0 -type d \( ! -name . \) -exec bash -c "cd '{}' && sls deploy --stage $stage --org ample --app open-chalmers" \;
fi