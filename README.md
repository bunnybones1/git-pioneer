# git-pioneer
An experimental tool to visual git. Built with threejs and NW.js.
Currently only developed on OSX so windows development will require extra unknown work.

## Setup
`npm i`
download the nw.js executable and place it in `git-pioneer/`

## Development
Development is done with budo, which will keep the client code hot-reloadable during edits.

You will need to run two commands in parallel:
`npm run webgl`
`npm run nwjs`