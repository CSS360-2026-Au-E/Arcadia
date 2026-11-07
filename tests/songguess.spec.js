import { expect } from "chai";
import {
  CLIP_SECONDS,
  ERAS,
  GENRES,
  cleanTitle,
  createGame,
  cutClip,
  describeChoice,
  id3Size,
  isCorrectGuess,
  isLastClip,
  rankPlaylists,
  searchText,
  typoDistance,
} from "../src/games/songguess";

const song = (title) => ({ title, artist: "Someone", link: "", preview: "" });

// A fake MP3: a 10 byte ID3 header saying 20 more header bytes follow,
// then 3000 bytes of "sound" (so 100 bytes per second over 30 seconds).
function fakeMp3() {
  const header = Buffer.from([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 20]);
  return Buffer.concat([header, Buffer.alloc(20), Buffer.alloc(3000, 1)]);
}

describe("song guesser", () => {
  it("clips start tiny and get longer", () => {
    expect(CLIP_SECONDS[0]).to.equal(0.1);
    for (let i = 1; i < CLIP_SECONDS.length; i++) {
      expect(CLIP_SECONDS[i]).to.be.greaterThan(CLIP_SECONDS[i - 1]);
    }
    expect(CLIP_SECONDS[CLIP_SECONDS.length - 1]).to.be.at.most(30);
  });

  it("knows when it is on the last clip", () => {
    const game = createGame(song("x"));
    expect(isLastClip(game)).to.equal(false);
    game.stage = CLIP_SECONDS.length - 1;
    expect(isLastClip(game)).to.equal(true);
  });

  it("cleans titles so small differences don't matter", () => {
    expect(cleanTitle("Dracula (with JENNIE)")).to.equal("dracula");
    expect(cleanTitle("Bohemian Rhapsody - Remastered 2011")).to.equal("bohemian rhapsody");
    expect(cleanTitle("Don't Stop Me Now!")).to.equal("dont stop me now");
    expect(cleanTitle("Song feat. Someone")).to.equal("song");
  });

  it("accepts the right title in any case", () => {
    const game = createGame(song("Blinding Lights"));
    expect(isCorrectGuess(game, "blinding lights")).to.equal(true);
    expect(isCorrectGuess(game, "  BLINDING LIGHTS  ")).to.equal(true);
  });

  it("accepts a small typo but not a different song", () => {
    const game = createGame(song("Blinding Lights"));
    expect(isCorrectGuess(game, "blinding lihgts")).to.equal(true);
    expect(isCorrectGuess(game, "save your tears")).to.equal(false);
    expect(isCorrectGuess(game, "")).to.equal(false);
  });

  it("needs short titles spelled exactly", () => {
    const game = createGame(song("Yes"));
    expect(isCorrectGuess(game, "yes")).to.equal(true);
    expect(isCorrectGuess(game, "yet")).to.equal(false);
  });

  it("counts typos", () => {
    expect(typoDistance("kitten", "sitting")).to.equal(3);
    expect(typoDistance("same", "same")).to.equal(0);
  });

  it("finds the size of the MP3 header", () => {
    expect(id3Size(fakeMp3())).to.equal(30);
    expect(id3Size(Buffer.alloc(50))).to.equal(0);
  });

  it("cuts the first few seconds of the MP3, keeping the header", () => {
    const mp3 = fakeMp3();
    expect(cutClip(mp3, 1).length).to.equal(30 + 100);
    expect(cutClip(mp3, 0.1).length).to.equal(30 + 10);
    expect(cutClip(mp3, 60).length).to.equal(mp3.length); // never past the end
  });

  it("has a General option for genre and era", () => {
    expect(GENRES.general.name).to.equal("General");
    expect(ERAS.general.name).to.equal("General");
  });

  it("searches Deezer for the genre and era picked", () => {
    expect(searchText("rock", "80s")).to.equal("80s rock hits");
    expect(searchText("pop", "general")).to.equal("pop hits");
    expect(searchText("general", "90s")).to.equal("90s hits");
  });

  it("describes the choice for the start message", () => {
    expect(describeChoice("rock", "80s")).to.equal("80s Rock");
    expect(describeChoice("general", "2000s")).to.equal("2000s");
    expect(describeChoice("general", "general")).to.equal("any");
  });

  it("only keeps playlists that match the genre and era, Deezer's own first", () => {
    const playlists = [
      { id: 1, title: "80s Pop", nb_tracks: 80, user: { name: "Deezer Pop Editor" } },
      { id: 2, title: "Rock Hits 70s 80s 90s", nb_tracks: 150, user: { name: "someone" } },
      { id: 3, title: "80s Rock", nb_tracks: 50, user: { name: "Deezer Rock Editor" } },
      { id: 4, title: "2000s Rock", nb_tracks: 50, user: { name: "Deezer Rock Editor" } },
    ];
    const ranked = rankPlaylists(playlists, "rock", "80s").map((p) => p.id);
    expect(ranked).to.deep.equal([3, 2]);
  });

  it("finds nothing when no playlist matches", () => {
    const playlists = [{ id: 1, title: "70s Happy Hits", nb_tracks: 70, user: { name: "x" } }];
    expect(rankPlaylists(playlists, "kpop", "70s")).to.deep.equal([]);
  });
});
