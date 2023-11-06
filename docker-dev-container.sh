#!/bin/bash

denv=FORCE_COLOR=3
volume=$(pwd)/.ass-data:/opt/ass-src/.ass-data
workdir=/opt/ass-src/
port=40115:40115

# container name:tag (tag is unix timestamp)
cname=ass:$(date +%s)

# build image
docker buildx build -t $cname .

# run the new image
docker run -it -e $denv -v $volume -w $workdir -p $port $cname

# wait for exit

echo
echo
echo -e "\033[32m\033[1mTo use this image again, run:\033[0m"
echo
echo "  docker run -it \\"
echo "    -e $denv \\"
echo "    -v \$(pwd)/.ass-data:/opt/ass-src/.ass-data \\"
echo "    -w $workdir \\"
echo "    -p $port \\"
echo "    $cname"
echo
