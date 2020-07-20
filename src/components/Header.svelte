<script>
  export let score;
</script>

<style>
  .header-game {
    border: 2px solid hsl(217, 16%, 45%);
    border-radius: 20px;
    width: 700px;
    display: flex;
    justify-content: space-between;
    margin: 50px 0;
  }

  .header-game-name {
    margin: 20px 30px;
    color: #fff;
    font-family: "Barlow Semi Condensed", sans-serif;
    width: 160px;
    text-transform: uppercase;
    line-height: 0.8;
    font-size: 1.5rem;
  }

  .header-game-score {
    padding: 10px 30px;
    text-align: center;
    margin: 16px 20px;
    background: #fff;
    width: 150px;
    border-radius: 10px;
  }

  .header-game-score span {
    text-transform: uppercase;
    font-size: 1.2rem;
    color: hsl(229, 64%, 46%);
    letter-spacing: 2px;
  }

  .header-game-score p {
    font-size: 4rem;
    font-weight: 700;
    color: hsl(229, 25%, 31%);
  }

  @media screen and (max-width: 575px) {
    .header-game {
      border: 1px solid hsl(217, 16%, 45%);
      width: 315px;
      margin: 26px;
    }

    .header-game-name {
      line-height: 0.8;
      font-size: 12px;
      font-weight: 500;
      width: 20px;
    }

    .header-game-score {
      background: #fff;
      width: 78px;
    }

    .header-game-score span {
      display: flex;
      justify-content: center;
      text-align: center;
      font-size: 0.5rem;
    }

    .header-game-score p {
      font-size: 2rem;
      font-weight: 700;
    }
  }
</style>

<div class="header-game">
  <div class="header-game-name">
    <h1>Rock Paper Scissors</h1>
  </div>
  <div class="header-game-score">
    <span>Score</span>
    <p>{score || '-'}</p>
  </div>
</div>
