<script>
  import Header from "./components/Header.svelte";
  import Selector from "./components/Selectors.svelte";
  import Result from "./components/Result.svelte";
  import Rules from "./components/Rules.svelte";

  let score = 0;
  let selectors = ["rock", "paper", "scissors"];
  let machinePicked;
  let userPicked;
  let resultMessage;

  function aleatory() {
    return selectors[Math.floor(Math.random() * selectors.length)];
  }

  function roulette() {
    machinePicked = aleatory();
  }

  function rules(nameChoisen, result) {
    const myNumber = selectors.findIndex(name => name === nameChoisen);
    const machineNumber = selectors.findIndex(name => name === result);
    let message = "";
    if (myNumber == machineNumber) {
      message = "You Tie";
    } else if (
      (myNumber - machineNumber) % 3 == 1 ||
      (myNumber - machineNumber) % 3 == -2
    ) {
      message = "You win";
      score++;
    } else {
      message = "You lose";
    }

    return message;
  }

  function onclick(name) {
    userPicked = name;
    roulette();
    const startRoulette = setInterval(roulette, 200);
    setTimeout(() => {
      clearInterval(startRoulette);
      resultMessage = rules(userPicked, machinePicked);
    }, 1400);
  }

  function onPlayagain() {
    userPicked = null;
    machinePicked = null;
    resultMessage = null;
  }
</script>

<div class="container">
  <Header {score} />
  {#if userPicked}
    <Result {userPicked} {machinePicked} {resultMessage} {onPlayagain} />
  {:else}
    <Selector {selectors} {onclick} />
  {/if}

  <Rules />
</div>
