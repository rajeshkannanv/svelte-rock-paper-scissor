<script>
  import { fly } from "svelte/transition";

  let isRuleOpen = false;

  function onRuleOpen() {
    isRuleOpen = true;
  }

  function onClose() {
    isRuleOpen = false;
  }
</script>

<style>
  .button-rules {
    position: absolute;
    bottom: 5%;
    right: 5%;
    background: transparent;
    border: 2px solid hsl(217, 16%, 45%);
    padding: 12px 36px;
    border-radius: 10px;
    text-transform: uppercase;
    color: #fff;
    letter-spacing: 3px;
    font-size: 1.2rem;
    cursor: pointer;
  }

  .rules {
    display: flex;
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.6);
  }

  .modal {
    display: absolute;
    left: 0;
    top: 50%;
    background: #fff;

    margin: 10% auto;
    padding: 20px;
    width: 400px;
    height: 400px;
    border-radius: 10px;
  }

  .modal > div {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 20px;
  }

  .modal div span {
    text-transform: uppercase;
    font-size: 1.5rem;
    letter-spacing: 1px;
  }

  .modal div button {
    border: none;
    background: transparent;
  }

  @media screen and (max-width: 575px) {
    .button-rules {
      bottom: 30px;
      right: 120px;
      font-size: 0.8rem;
    }

    .modal {
      padding: 0;
      width: 250px;
      height: 290px;
      margin: auto;
    }

    .modal > div {
      margin-top: 20px;
    }

    .modal div span {
      font-size: 1rem;
    }

    .modal div:last-child img {
      width: 200px;
      height: 200px;
    }
  }
</style>

<div>
  <button class="button-rules" on:click={onRuleOpen}>rules</button>
</div>

{#if isRuleOpen}
  <div class="rules" in:fly out:fly>
    <div class="modal">
      <div>
        <span>Rules</span>
        <button on:click={onClose}>
          <img src="./img/icon-close.svg" alt="close" />
        </button>
      </div>
      <div>
        <img src="./img/image-rules.svg" alt="rules" />
      </div>
    </div>
  </div>
{/if}
