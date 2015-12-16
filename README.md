# ggxrd_matchups
Grab matchups from ggxrd.com and output in a csv

Requires node 4+

`npm install` to install all dependencies

Usage:
`node index.js [--rev] [--metagame]`

Use `--rev` to fetch -REVELATOR- data instead of -SIGN-
Use `--metagame` to format the data in a way that is compatible with Blinkity's [metagame balance tool](https://github.com/Blinkity/metagame) (i.e. no headers, let statistics be fractions of 0-1 instead of 0-10)
