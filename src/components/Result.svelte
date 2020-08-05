<script>
  export let userPicked = "";
  export let machinePicked = "";
  export let resultMessage;
  export let onPlayagain;
</script>

<style>
  .game {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
  }

  .game div {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .game p {
    font-size: 1.5rem;
    color: #fff;
    text-transform: uppercase;
  }

  .picked {
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 50%;
    height: 300px;
    width: 300px;
    box-shadow: inset 0 -10px rgba(0, 0, 0, 0.15);
    margin: 50px;
  }

  .picked > div {
    height: 220px;
    width: 220px;
    background: #fff;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-shadow: inset 0 10px rgba(0, 0, 0, 0.15);
  }

  .game img {
    height: 120px;
    width: 120px;
  }

  .result > button {
    width: 220px;
    height: 56px;
    color: hsl(349, 71%, 52%);
    text-transform: uppercase;
    font-family: "Barlow Semi Condensed", sans-serif;
    font-size: 1rem;
    letter-spacing: 2px;
    border-radius: 10px;
  }

  .result > span {
    color: #fff;
    text-transform: uppercase;
    font-size: 3rem;
    letter-spacing: 2px;
    margin-bottom: 15px;
  }

  @media screen and (max-width: 575px) {
    .game > div {
      display: flex;
      flex-direction: column-reverse;
    }

    .game p {
      font-size: 1rem;
      color: #fff;
      text-transform: uppercase;
    }

    .picked {
      height: 130px;
      width: 130px;
      margin: 20px;
    }

    .picked > div {
      height: 100px;
      width: 100px;
    }

    .game img {
      height: 50px;
      width: 50px;
    }

    .result {
      position: absolute;
      left: 0;
      right: 0;
      top: 380px;
    }
  }
</style>

<div class="game">
  <div>
    <p>You picked</p>
    <div class="picked button-{userPicked}">
      <div class="circle">
        <img src="./img/icon-{userPicked}.svg" alt={userPicked} />
      </div>
    </div>
  </div>
  {#if resultMessage}
    <div class="result">
      <span id="resultText">{resultMessage}</span>
      <button id="playagain" on:click={onPlayagain}>Play again</button>
    </div>
  {/if}
  <div>
    <p>The Machine picked</p>
    <div class="picked button-{machinePicked}">
      <div class="circle">
        <img src="./img/icon-{machinePicked}.svg" alt={machinePicked} />
      </div>
    </div>
  </div>
</div>
