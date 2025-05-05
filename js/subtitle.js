function getRandomGreeting() {
  var greetings = [
    "credit to 3kh0, go follow him",
    "toasters will toast",
    "tactical nuke incoming",
    "warning, this is a game site :0",
    "tung tung tung tung tung sahur",
    "bombino crocodillo",
    "debian is fire",
    "ti 84 plus ce is the best calculator",
    "use linux",
    "tomdogdoggy on minecraft java/bedrock :)",
    "100 men vs 1 gorrila who will win?",
    "check out my main site thatboyo.github.io/3.2",
    "free games! :)",
    "more messages to come",
    "greninja9992266 on roblox",
    "lock in bro",
    "brainrot must die",
    
  ];
  var randomIndex = Math.floor(Math.random() * greetings.length);
  return greetings[randomIndex];
}

document.getElementById("subtitle").innerText = getRandomGreeting();
