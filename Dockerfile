FROM node:lts

ADD entrypoint.sh /entrypoint.sh
ADD graph.js /graph.js
ADD package.json /package.json
ENTRYPOINT ["/entrypoint.sh"]
