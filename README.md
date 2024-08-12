# WarChestDataConverter

A converter for game data of WarChestOnline. It's not optimal. A game will be compressed to ~10-15kb; zipping that brings it down to <2.5kb per game (maybe less when compressing many at a time).

bigToSmallConverter.js is the main file that converts the game data to a smaller format. It expects one big json wth all the snapshots (unlike in the replay, where they come in many files with 20 snapshots per file). Unfortunately, the decrees don't have all the data and therefore need the extra file.

The algorithms basically works thusly:

- Create an alternative version of a snapshot. Only keeping important data (I think keeping all the data would have not been that much worse, but some of them seemed pointless).
- Keep the first version and then create diffs for each new snapshot. The snapshot just says which fields have changed.
- Replacing all the strings wit shorter strings (essentially numbers)
- Writing the data out to a file (with one match = one line in the output, so that I can basically read it line by line).

The process converts most of the values to strings and as mentioned above, not all information is kept. So the original file cannot be recreated. But it should be enough to recreate all the games. Originally, I wanted to figure out the exact move that has been done, which would have compressed the thing a lot more. However, that would have required to actually know and implement how all the units work, which will have to wait for the future I guess.
