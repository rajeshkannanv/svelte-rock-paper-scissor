<script>
  export let onclick;
  export let selectors = [];
</script>

<style>
  .choice {
    margin: 0 auto;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    /* background: url("./img/bg-triangle.svg") no-repeat center; */
  }

  .buttons {
    border: none;
    border-radius: 50%;
    height: 150px;
    width: 150px;
    box-shadow: inset 0 -6px rgba(0, 0, 0, 0.15);
    margin: 50px;
    cursor: pointer;
  }

  .buttons > span {
    height: 120px;
    width: 120px;
    background: #fff;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-shadow: inset 0 6px rgba(0, 0, 0, 0.15);
  }

  @media screen and (max-width: 575px) {
    .buttons {
      height: 120px;
      width: 120px;
      margin: 20px;
    }

    .buttons > span {
      height: 90px;
      width: 90px;
    }

    .choice {
      background-size: 210px;
    }
  }
</style>

<div class="choice">
  {#each selectors as name}
    <button class="buttons button-{name}" on:click={() => onclick(name)}>
      <span>
        <img src="./img/icon-{name}.svg" alt={name} />
      </span>
    </button>
  {/each}
</div>
