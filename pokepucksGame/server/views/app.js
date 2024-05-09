/****************************** Script Header ******************************\
Project: PokePucks
Author: Brandon Camacho
Editors: Brandon Camacho, Logan Cruz, Sergio Davalos 

<Description>
Code for the frontend side for the PokePucks game.
\***************************************************************************/

// Define the IP address and port
const IP_ADDRESS = window.location.hostname;
const PORT = 3000;

// Define the urls
const ROOT_URL = `http://${IP_ADDRESS}:${PORT}/`; // `http://ipAddressOfThisServer:port/`;
const LOGIN_URL = `http://${IP_ADDRESS}:${PORT}/login`; // `http://ipAddressOfThisServer:port/login`;
const LOGOUT_URL = `http://${IP_ADDRESS}:${PORT}/logout`; // `http://ipAddressOfThisServer:port/logout`;
const LOBBY_URL = `http://${IP_ADDRESS}:${PORT}/lobby`; // `http://ipAddressOfThisServer:port/lobby`;
const CHATROOM_URL = `http://${IP_ADDRESS}:${PORT}/chatroom`; // `http://ipAddressOfThisServer:port/chatroom`;

// Defines socket = to a new websocket
const socket = io(ROOT_URL);

// Define the elements
const msgInput = document.querySelector('#message');
const nameInput = document.querySelector('#name');
const chatRoom = document.querySelector('#room');
const activity = document.querySelector('.activity');
const usersList = document.querySelector('.user-list');
const chatDisplay = document.querySelector('.chat-display');

// Define the pages
const loginPage = document.getElementById('login-page');
const lobbyPage = document.getElementById('lobby-page');
const chatroomPage = document.getElementById('chatroom-page');

// Define the variables
var username = '';
var roomCode = '';
var privacy = '';
var method = '';

// Function used to send a message
function sendMessage(e) { // sendMessage recieves an event which is represented with the letter e
    // Allows you to submit the form without reloading the page
    e.preventDefault();

    // Emit the message event
    socket.emit('message', {
        name: username, // The name of the user
        text: msgInput.value, // The text of the message
    });
    // Replace the msgInput with nothing
    msgInput.value = "";
    // Puts the focus back on the msgInput
    msgInput.focus();
};

// Generates room code used to enter a chatroom
function generateRoomCode() {
    let roomCode = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; // Define the characters that can be used in the roomCode
    const charactersLength = characters.length; // Define the length of the characters variable
    let counter = 0;
    while (counter < 5) { // While the counter is less than 5
        // Add a random character from the characters variable to the roomCode
        roomCode += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter++; // Increment the counter
    };
    // Return the roomCode
    return roomCode;
};

// Function used for pressing the login button
function login() {
    // Redirect to the login page
    window.location.href = LOGIN_URL;

    // Store the state in sessionStorage
    sessionStorage.setItem('isLoggedIn', 'true');
};

// Function used for pressing the logout button
function logout() {
    // Redirect to the logout page
    window.location.href = LOGOUT_URL;
};

// Function used for pressing the create room button
function createRoom() {
    // Check if the nameInput has a value
    if (nameInput.value) {
        username = nameInput.value; // Set the username to the value of the nameInput
        chatRoom.value = generateRoomCode(); // Set the chatRoom value to the generated room code
        roomCode = chatRoom.value; // Set the roomCode to the chatRoom value
        privacy = document.getElementById('privacy').value; // Set the privacy to the value of the privacy dropdown
        method = 'create'; // Set the method to create

        // Store the values in sessionStorage
        sessionStorage.setItem('username', username);
        sessionStorage.setItem('roomCode', roomCode);
        sessionStorage.setItem('privacy', privacy);
        sessionStorage.setItem('method', method);

        // Redirect to the chatroom page
        window.location.href = CHATROOM_URL;
    };
};

// Function used for when a user generates a chatroom
function enterRoomCreate() {
    console.log('Entering room');
    console.log(username);
    console.log(roomCode);

    // Emit 'enterRoom' event and wait for server response
    socket.emit('enterRoom', {
        name: username,
        room: roomCode,
        privacy: privacy,
        method: method
    });
};

// Function used for pressing the join room button
function joinRoom() {
    // Check if the nameInput and chatRoom have values
    if (nameInput.value && chatRoom.value) {
        username = nameInput.value; // Set the username to the value of the nameInput
        roomCode = chatRoom.value; // Set the roomCode to the value of the chatRoom
        method = 'join'; // Set the method to join

        // Store the values in sessionStorage
        sessionStorage.setItem('username', username);
        sessionStorage.setItem('roomCode', roomCode);
        sessionStorage.setItem('method', method);

        // Redirect to the chatroom page
        window.location.href = CHATROOM_URL;

    } else { alert('Please fill in the room code field.') }; // Alert the user to fill in the room code field
};

// Function used for pressing the enter room button
function enterRoomClicked(roomCodeClicked) {
    // Check if the nameInput has a value
    if (!nameInput.value) {
        // Alert the user to fill in the name field
        alert('Please fill in the name field.');
        return;
    };

    // Set the values of the fields
    document.getElementById('room').value = roomCodeClicked || '';
    document.getElementById('join').click();

    username = nameInput.value; // Set the username to the value of the nameInput
    roomCode = roomCodeClicked; // Set the roomCode to the value of the roomCodeClicked
    method = 'join'; // Set the method to join

    // Store the values in sessionStorage
    sessionStorage.setItem('username', username);
    sessionStorage.setItem('roomCode', roomCode);
    sessionStorage.setItem('method', method);

    // Redirect to the chatroom page
    window.location.href = CHATROOM_URL;
};

// Function used for when a user enters a chatroom
function enterRoomJoin() {
    // Emit 'enterRoom' event and wait for server response
    socket.emit('enterRoom', {
        name: username,
        room: roomCode,
        method: method
    });
};

console.log('Setting window.onload');
// When the window loads
window.addEventListener('load', () => {
    console.log('Page loaded');
    // Check if the page is the login page
    if (window.location.href === CHATROOM_URL) {
        console.log('Chatroom page loaded');

        // Query Selector for submitting the message
        document.querySelector('.form-msg').addEventListener('submit', sendMessage);

        // Checks if the user is typing
        msgInput.addEventListener('keypress', () => {
            // Emit the activity event
            socket.emit('activity', username);
        });

        // Retrieve the values from sessionStorage
        username = sessionStorage.getItem('username');
        roomCode = sessionStorage.getItem('roomCode');
        privacy = sessionStorage.getItem('privacy');
        method = sessionStorage.getItem('method');

        // Check the method
        switch (method) {
            case 'create': // If the method is create, create the room
                console.log('Create method');
                enterRoomCreate();
                sessionStorage.setItem('method', 'join');
                break;
            case 'join': // If the method is join, join the room
                console.log('Join method');
                enterRoomJoin();
                sessionStorage.setItem('method', 'join');
                break;
            default: // If there is no method, log an error
                console.log('Error: No method given');
        };
    };
});
console.log('Setting window.onload done');

// Function used for when a user leaves a chatroom
function leaveRoom() {
    // Emit 'leaveRoom' event
    socket.emit('leaveRoom');

    // Not sure if the code below does anything but im keeping it in case it does
    socket.on('leaveRoomConfirmation', () => {
    });

    // Redirect to the lobby page
    window.location.href = LOBBY_URL;
};

// Listen for messages
socket.on('message', (data) => {
    // Check if the page is the chatroom page
    if (window.location.href === CHATROOM_URL) {

        // Define variables
        activity.textContent = "";
        const { name, text, id, time } = data;

        // Code for creating the message in the chat html and formatting it
        const li = document.createElement('li'); // Create a new list item
        li.className = 'post'; // Set the class name of the list item to 'post'
        if (id === socket.id) li.className = 'post post--left'; // If the id is the same as the socket id, set the class name to 'post post--left'
        if (id !== socket.id && name !== 'YrXoETWEMg5_jKLdAAADtkKSWJqh33L2lrcXAAABWbFLr2OR7EHk719MAAABxkXxW0_R2EuZ7XVXAAAD') li.className = 'post post--right'; // If the id is not the same as the socket id and the name is not the same as the default name, set the class name to 'post post--right'
        if (name !== 'YrXoETWEMg5_jKLdAAADtkKSWJqh33L2lrcXAAABWbFLr2OR7EHk719MAAABxkXxW0_R2EuZ7XVXAAAD') { // If the name is not the same as the default name
            li.innerHTML = `<div class="post__header ${id === socket.id // Set the inner html of the list item to the following
                ? 'post__header--user' // If the id is the same as the socket id, set the class name to 'post__header--user'
                : 'post__header--reply' // If the id is not the same as the socket id, set the class name to 'post__header--reply'
                }">
                    <span class="post__header--name">${name}</span>
                    <span class="post__header--time">${time}</span>
                    </div>
                    <div class="post__text">${text}</div>`
        } else { // If the name is the same as the default name
            li.innerHTML = `<div class ="post__text">${text}</div>`
        };
        // Append the list item to the chat display
        document.querySelector('.chat-display').appendChild(li);

        // Scroll to the bottom of the chat display
        chatDisplay.scrollTop = chatDisplay.scrollHeight;
    };
});

let activityTimer; // Define the activity timer
// Listen for activity
socket.on('activity', (name) => {
    // Set the activity text content to the name of the user and that they are typing
    activity.textContent = `${name} is typing...`

    // Clear after 3 seconds
    clearTimeout(activityTimer);
    activityTimer = setTimeout(() => {
        activity.textContent = "";
    }, 3000);
});

// Function used to show the users in the chatroom
function showUsers(users) {
    // Set the text content of the users list to nothing
    usersList.textContent = '';

    // If there are users
    if (users) {
        // Set the inner html of the users list to the following
        usersList.innerHTML = `<em>Users in ${roomCode}:</em>`; // Set the text to 'Users in roomCode'
        users.forEach((user, i) => { // For each user
            usersList.textContent += ` ${user.name}`; // Set the text content of the users list to the name of the user
            if (users.length > 1 && i !== users.length - 1) { // If there is more than one user and the index is not the same as the length of the users list - 1
                usersList.textContent += ","; // Set the text content of the users list to ','
            };
        });
    };
};

// Listen for user list event
socket.on('userList', ({ users }) => {
    // Run the showUsers function with the users
    showUsers(users);
});

// Listen for room full event
socket.on('joinedRoomFull', () => {
    alert('The room you tried to join is full.');

    // Redirect to the lobby page
    window.location.href = LOBBY_URL;
});

// Listen for room not found event
socket.on('joinedRoomNotFound', () => {
    alert('The room you tried to join does not exist.');

    // Redirect to the lobby page
    window.location.href = LOBBY_URL;
});

// PokePucks Game Code
var blackSide = document.getElementById('blackSide'); // Get the black side of the pog
var whiteSide = document.getElementById('whiteSide'); // Get the white side of the pog
var canvas = document.getElementById('canvas'); // Get the canvas
var ctx = canvas.getContext('2d'); // Get the context of the canvas
ctx.font = '20px Arial'; // Set the font of the context
document.getElementById('canvas').width = window.innerWidth; // Set the width of the canvas to the window inner width
document.getElementById('canvas').height = window.innerHeight; // Set the height of the canvas to the window inner height
ctx.fillStyle = 'silver'; // Set the fill style of the context to silver
ctx.fillRect(0, 0, canvas.width, canvas.height); // Fill the rectangle of the context

// Get the ready checkbox and listen for the change event
document.getElementById('ready-checkbox').addEventListener('change', function (e) {
    // If the checkbox is checked
    if (e.target.checked) {
        console.log('Ready checkbox checked. Emitting player ready event.');

        // Emit the player ready event
        socket.emit('player ready', roomCode);
    };

    // If the checkbox is not checked
    if (e.target.checked === false) {
        console.log('Ready checkbox unchecked. Emitting player not ready event.');

        // Emit the player not ready event
        socket.emit('player not ready', roomCode);
    };
});


// Listen for all players ready event
socket.on('all players ready', function () {
    console.log('Received all players ready event. Enabling start game button.');

    // Enable the start game button
    document.getElementById('start-game-button').disabled = false;
});

// Listen for not all players ready event
socket.on('not all players ready', function () {
    // Get the start game button
    let startGameButton = document.getElementById('start-game-button');
  
    // If the start game button is not disabled
    if (!startGameButton.disabled) {
        // Disable the start game button
        startGameButton.disabled = true;
    }
});

// Listen for game started event
socket.on('game started', function () {
    // Disable the ready checkbox
    document.getElementById('ready-checkbox').disabled = true;

    const startGameButton = document.getElementById('start-game-button'); // Get the start game button
    const stepGameButton = document.getElementById('step-game-button'); // Get the step game button

    // If the start game button exists
    if (startGameButton) {
        startGameButton.disabled = true; // Disable the start game button
        stepGameButton.disabled = false; // Enable the step game button
    };
});

// Function used to start the game
function startGameClient() {
    const room = sessionStorage.getItem('roomCode'); // Get the room code from the session storage

    const startGameButton = document.getElementById('start-game-button'); // Get the start game button

    // If the start game button exists
    if (startGameButton) {
        startGameButton.disabled = true; // Disable the start game button
    };

    // Emit the gameStart event
    socket.emit('gameStart', room, function (error, response) {
        console.log('does this even run?');
        if (error) { // If there is an error
            console.error(`Error: ${error}`); // Log the error
        } else { // If there is no error
            console.log('Game started'); // Log that the game has started
        };
    });

    // This for loop is used with step game to immediately step the game 8 times. This goes through the setup phase of the game so you can immediately start at the loop phase. If there is gameplay added to the setup phase, this is the code you need to modify.
    for (let i = 0; i < 8; i++) {
        stepGameClient();
    };
};

let gameStopped = false; // Define the game stopped variable

// Function used to draw the flipped pogs
function drawFlippedPogs() {
    // Loop through each pog
    for (let i = 0; i < Pucks.length; i++) {
        let pog = gameData.game.Pucks[i];
        // If the pog is flipped up, draw it and stop the game
        if (pog.side === 'up') {
            ctx.drawImage(whiteSide, 100, 100, 100, 100);
            gameStopped = true;
        };
    };
// If the game is stopped, prompt the player to pick a pog and return the flipped pogs to the pile
    if (gameStopped) {
        let pickedPog = promptPlayerToPickPog();
        returnFlippedPogsToPile(pickedPog);
        gameStopped = false;
    };
};

// Function used to prompt the player to pick a pog
function promptPlayerToPickPog() {
    // Find the flipped pogs
    let flippedPogs = gameData.game.arena.filter(pog => pog.side === 'up');

    // Display the flipped pogs to the player
    let message = "Flipped pogs:\n";
    for (let i = 0; i < flippedPogs.length; i++) {
        message += `ID: ${flippedPogs[i].id}, Name: ${flippedPogs[i].name}\n`;
    };
    alert(message);

    // Prompt the player to pick a pog
    let pogId = prompt("Please enter the ID of the pog you want to pick:");
    let pickedPog = gameData.game.arena.filter(pog => pog.id === pogId);
    return pickedPog;
};

// Function to return the flipped pogs to the pile
function returnFlippedPogsToPile(pickedPog) {
    // Implement the logic to return the flipped pogs to the pile
    // Exclude the picked pog
}

// Function used to step through the game   
function stepGameClient() { // pass the room as a parameter
    const room = sessionStorage.getItem('roomCode'); // Get the room code from the session storage

    // Check that the socket is connected
    console.log(`Socket connected: ${socket.connected}`);

    // Emit the step-game event
    socket.emit('step-game', room, function (error, response) {
        console.log('socket emitted');
        if (error) { // If there is an error
            console.error(`Error: ${error}`); // Log the error
        } else if (response.status === 'error') { // If there is an error in the response
            console.error(`Error: ${response.message}`); // Log the error message
        } else { // If there is no error
            console.log(`Step game success for room: ${room}`); // Log that the step game was successful
            console.log(response.gameData); // log the game data received from the server
        };
    });
    console.log(`Room: ${room}`);
};

// Listen for step game success event
socket.on('step-game-success', (data, gameData) => { // pass the data and gameData as parameters
    console.log('Data:', data);
    console.log('custom test success');
    console.log('Game Data:', gameData);

    let currentPlayer; // Define the current player
    try { // Try to get the current player
        currentPlayer = gameData.usersInRoom[gameData.game.turn].name; // Set the current player to the name of the user in the room at the current game turn
    } catch (error) { // If there is an error
        console.error('Invalid turn index:', gameData.game.turn); // Log the error

        // Handle the error appropriately, e.g., by setting currentPlayer to a default value
        currentPlayer = null;
    };
    console.log('Current Player:', currentPlayer);

    // Function to update the step game button based on the current game turn
    function updateStepGameButton() {
        // Holds the step game button
        const stepGameButton = document.getElementById('step-game-button');

        // If the username is the current player
        if (username === currentPlayer) {
            stepGameButton.disabled = false; // Enable the step game button
            stepGameButton.textContent = 'Step Game'; // Change the text of the step game button
        } else { // If the username is not the current player
            stepGameButton.disabled = true; // Disable the step game button
            stepGameButton.textContent = 'Step Game \n (Not Your Turn)'; // Change the text of the step game button
        };
    };
    updateStepGameButton();

    // Function to update the game stage based on the game data
    function step() {
        switch (gameData.game.stage) {
            case 'setup':
                stage_setup();
                break;
            case 'loop':
                stage_loop();
                break;
            case 'end':
                stage_end();
                break;
            default:
                break;
        };
    };

    // Function for setup stage
    function stage_setup() {
        switch (gameData.game.phase) {
            case 0: // Decide players
                console.log(gameData.game.players[0]);
                console.log(gameData.game.players[1]);
                break;
            case 1: // Decide Special Rules
                break;
            case 2: // Build health stack
                // for each player, add 14 pogs to their health stack
                if (gameData.game.players[0].hp.length == 0 && gameData.game.players[1].hp.length == 0) {
                    for (let i = 0; i < gameData.game.players.length; i++) {
                        for (let j = 0; j < 15; j++) {
                            console.log(gameData.game.players[i].hp.length);
                        };
                    };
                };
                ctx.fillStyle = 'silver';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = 'white';
                ctx.font = '40px Arial';
                ctx.fillText(`Player 1 Hp Stack ${gameData.game.players[0].hp.length}`, 100, 100);
                ctx.fillText(`Player 2 Hp Stack ${gameData.game.players[1].hp.length}`, 100, 200);


                ctx.fillText(gameData.game.stage, 20, 50);
                break;
            case 3: // Build arena
                // while arena is < 8, each player pops 1 from hp to arena
                // while (gameData.game.arena.length < 8) {
                // };
                break;
            case 4: // Pick a slammer
                // each player picks a slammer
                break;
        };
        if (gameData.game.phase > 4) {
        };
    };

    // Function for loop stage
    function stage_loop() {
        switch (gameData.game.phase) {
            case 0: // Top off
                console.log('case 0 test');

                console.log(gameData.game.players[0].Slammer.side);
                console.log(gameData.game.players[1].Slammer.side);
                // while arena is < 8, player pops 1 from hp to arena
                // if player has no pogs in their stack, stop and put into critical
                // while (gameData.game.arena.length < 8) {
                //     if (gameData.game.players[0].hp.length == 0) {
                //         break;
                //     }
                //     if (gameData.game.turn == 0) {
                //         if (gameData.game.players[0].hp.length > 0) {
                //             console.log('testing your mom 1');
                //         }
                //     }
                //     if (gameData.game.players[1].hp.length == 0) {
                //         break;
                //     }
                //     else {
                //         if (gameData.game.players[1].hp.length > 0) {
                //             console.log('testing your mom 2')
                //         }
                //     }
                // }
                let c
                for (let i = 0; i < gameData.game.players[0].hp.length; i++) {
                    c += 15
                    ctx.drawImage(blackSide, 100, 100, 100, 100);
                    console.log('testing for loop 1')
                }
                ctx.drawImage(document.getElementById('squirtle'), 500, 80, 100, 100)
                for (let i = 0; i < gameData.game.players[0].prize.length; i++) {
                    ctx.drawImage(whiteSide, 200, 100, 100, 100);
                }
                for (let i = 0; i < gameData.game.players[1].hp.length; i++) {
                    c += 15
                    ctx.drawImage(blackSide, 100, 200, 100, 100);
                    console.log('testing for loop 2')
                }
                ctx.drawImage(document.getElementById('bulbasaur'), 500, 200, 100, 100)
                for (let i = 0; i < gameData.game.players[1].prize.length; i++) {
                    ctx.drawImage(whiteSide, 200, 200, 100, 100);
                }

                function drawFlippedPogs() {
                    // This loop goes through each pog in the Pucks array
                    for (let i = 0; i < Pucks.length; i++) {
                        let pog = gameData.game.Pucks[i];
                        // If the pog's side is 'up', it draws the pog on the canvas and sets gameStopped to true
                        if (pog.side === 'up') {
                            ctx.drawImage(whiteSide, 100, 100, 100, 100);
                            gameStopped = true;
                        }
                    }

                    // If gameStopped is true (meaning a pog was flipped up), it executes the following code
                    if (gameStopped) {
                        // Disables the step game button to pause the game
                        const stepGameButton = document.getElementById('step-game-button');
                        stepGameButton.disabled = true;

                        // Prompts the player to pick a pog and returns the picked pog
                        let pickedPog = promptPlayerToPickPog();
                        // Returns the flipped pogs to the pile, excluding the picked pog
                        returnFlippedPogsToPile(pickedPog);

                        // Determines the winning player based on the current turn and adds the picked pog to the winning player's inventory
                        let winningPlayer = gameData.game.turn === 0 ? gameData.game.players[1] : gameData.game.players[0];
                        addToInventory(winningPlayer, pickedPog);

                        // Finds the index of the picked pog in the Pucks array and removes it from the array
                        let pogIndex = gameData.game.Pucks.findIndex(pog => pog.id === pickedPog.id);
                        if (pogIndex !== -1) {
                            gameData.game.Pucks.splice(pogIndex, 1);
                        }

                        // Sets gameStopped to false to indicate that no pogs are flipped up
                        gameStopped = false;

                        // Enables the step game button to resume the game
                        stepGameButton.disabled = false;
                    }
                }

                // Get the textarea elements for the collected pogs of player 1 and player 2
                let logY = 300; // Y position for the log messages on the canvas
                let collectedPogsPlayer1 = document.getElementById('CollectedPogsPlayer1');
                let collectedPogsPlayer2 = document.getElementById('CollectedPogsPlayer2');

                // Draw an image on the canvas
                ctx.drawImage(document.getElementById('blackSide'), 2000, 80, 100, 100);

                // Log messages for debugging
                console.log('Testing for loop 3');
                console.log(gameData.game.arena.length);

                // Loop through each pog in the arena
                for (let i = 0; i < gameData.game.arena.length; i++) {
                    let pog = gameData.game.arena[i];

                    // Add the name of the taken pog to the textarea for player 1
                    collectedPogsPlayer1.value += "Pog Taken: " + pog.name + '\n';

                    // Prepare the message to be displayed on the canvas
                    let message = 'Pog taken: ' + pog.name;
                    ctx.font = '20px Arial';
                    ctx.fillStyle = 'black';
                    // Display the message on the canvas
                    ctx.fillText(message, 10, logY);
                    // Move the Y position down for the next message
                    logY += 20;
                }

                // Function to add a pog to a player's inventory
                function addToInventory(player, pog) {
                    // Check if the player has an inventory property, if not, initialize it as an empty array
                    if (!player.inventory) {
                        player.inventory = [];
                    }

                    // Add the pog to the player's inventory
                    player.inventory.push(pog);
                }

                // Function to select a pog
                function selectPog(player, pogIndex) {
                    // Remove the pog from the arena and store it in selectedPog
                    let selectedPog = gameData.game.arena.splice(pogIndex, 1)[0];

                    // Add the selected pog to the player's inventory
                    addToInventory(player, selectedPog);

                    // Determine which player's textarea to update based on the player parameter
                    let collectedPogs = player === player1 ? collectedPogsPlayer1 : collectedPogsPlayer2;
                    // Update the textarea for the player with the name of the taken pog
                    collectedPogs.value += "Pog Taken: " + selectedPog.name + '\n';

                    // Prepare the message to be displayed on the canvas
                    let message = 'Pog taken: ' + selectedPog.name;
                    ctx.font = '20px Arial';
                    ctx.fillStyle = 'black';
                    // Display the message on the canvas
                    ctx.fillText(message, 10, logY);
                    // Move the Y position down for the next message
                    logY += 20;
                }

                break;
            case 1:// Knockout
                console.log('case 1 test');
                console.log(gameData.game.players[0].Slammer.side);
                console.log(gameData.game.players[1].Slammer.side);
                // if player has no pogs in their stack, move that player's slammer into the center.
                if (gameData.game.players[0].hp.length <= 0) {
                    console.log('gameData.game should not run');
                };
                if (gameData.game.players[1].hp.length <= 0) {
                    console.log('gameData.game should not run');
                };
                break;
            case 2:// Count Attacks
                console.log('case 2 test');
                console.log(gameData.game.players[0].Slammer.side);
                console.log(gameData.game.players[1].Slammer.side);
                //Each player gets the bare minimum of 1 attack, before checking for abilities, status, and other special rules.
                ctx.fillStyle = 'silver';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = 'white';
                ctx.font = '40px Arial';
                ctx.fillText(`Player 1 Hp Stack ${gameData.game.players[0].hp.length}`, 100, 100);
                ctx.fillText(`Player 2 Hp Stack ${gameData.game.players[1].hp.length}`, 100, 200);

                ctx.fillText(gameData.game.stage, 20, 50);

                let y
                for (let i = 0; i < gameData.game.players[0].hp.length; i++) {
                    y += 15
                    ctx.drawImage(blackSide, 100, 100, 100, 100);
                    console.log('testing for loop 1')
                }
                ctx.drawImage(document.getElementById('squirtle'), 500, 80, 100, 100)
                for (let i = 0; i < gameData.game.players[0].prize.length; i++) {
                    ctx.drawImage(whiteSide, 200, 100, 100, 100);
                }

                for (let i = 0; i < gameData.game.players[1].hp.length; i++) {
                    ctx.drawImage(blackSide, 100, 200, 100, 100);
                    console.log('testing for loop 2')
                }
                ctx.drawImage(document.getElementById('bulbasaur'), 500, 200, 100, 100)
                for (let i = 0; i < gameData.game.players[1].prize.length; i++) {
                    ctx.drawImage(whiteSide, 200, 200, 100, 100);
                }
                break;


            case 3://Make Attacks
                console.log('case 3 test');
                console.log(gameData.game.players[0].Slammer.side);
                console.log(gameData.game.players[1].Slammer.side);
                //The current player makes an attack, then the other player makes an attack. Repeat until all attacks have been made. 
                //If a player has flipped over pogs in the arena, pick them up and place it in prize, the rest that have been knocked
                // over are placed back into the arena.

                let power;
                if (gameData.game.turn == 0) {
                    // while (gameData.game.players[0].attacks > 0) {
                    //     console.log('Man Im dead')
                    //     console.log(gameData.game.players[0].attacks);
                    //     power = gameData.game.players[gameData.game.turn].Slammer.attack();

                    //     let slammerInArena = false;
                    //     for (let i = 0; i < gameData.game.arena.length; i++) {
                    //         console.log('Arena Slammer:', gameData.game.arena[i]);
                    //         console.log('Player Slammer:', gameData.game.players[gameData.game.turn].Slammer);
                    //         if (objectsAreEqual(gameData.game.arena[i], gameData.game.players[gameData.game.turn].Slammer)) {
                    //             console.log('test');
                    //             slammerInArena = true;
                    //             break;
                    //         }
                    //     }

                    //     console.log('slammerInArena:', slammerInArena);
                    //     console.log('gameData.game.turn:', gameData.game.turn);
                    //     if (slammerInArena && gameData.game.turn == 0) {
                    //         console.log('slammer up maybe');
                    //         let power1 = gameData.game.players[1].Slammer.attack();
                    //         if (power > power1) {
                    //         }
                    //     }
                    //     if (!slammerInArena) {
                    //         console.log('bruh');
                    //         for (let i = gameData.game.arena.length - 1; i >= 0; i--) {
                    //             if (gameData.game.arena[i] && typeof gameData.game.arena[i].flip === 'function') {
                    //                 let flipnum = gameData.game.arena[i].flip();
                    //                 console.log('power:', power);
                    //                 console.log('flipnum:', flipnum);
                    //                 if (power > flipnum) {
                    //                     console.log('test')
                    //                 }
                    //             }
                    //         }
                    //     }
                    // }
                } else {
                    // while (gameData.game.players[1].attacks > 0) {
                    //     power = gameData.game.players[gameData.game.turn].Slammer.attack();
                    //     if (gameData.game.arena == gameData.game.players[gameData.game.turn].Slammer && gameData.game.turn == 1) {
                    //         let power1 = gameData.game.players[0].Slammer.attack();
                    //         if (power > power1) {
                    //         }
                    //     }
                    //     if (gameData.game.arena != gameData.game.players[gameData.game.turn].Slammer) {
                    //         for (let i = gameData.game.arena.length - 1; i >= 0; i--) {
                    //             if (gameData.game.arena[i] && typeof gameData.game.arena[i].flip === 'function') {
                    //                 let flipnum = gameData.game.arena[i].flip();
                    //                 console.log('power:', power);
                    //                 console.log('flipnum:', flipnum);
                    //                 if (power > flipnum) {
                    //                     console.log('test')
                    //                 }
                    //             }
                    //         }
                    //     }
                    // }
                };
                break;
            case 4://Discard pucks
                console.log('case 4 test');
                console.log(gameData.game.players[0].Slammer.side);
                console.log(gameData.game.players[1].Slammer.side);
                //If a player wants to use a puck, remove that puck from the power stack and place it in the discard pile, while
                //checking rules for that puck, and special rules.
                if (gameData.game.turn == 0) {
                } else {
                };

                break;
            case 5://Check for winner
                console.log('case 5 test');
                console.log(gameData.game.players[0].Slammer.side);
                console.log(gameData.game.players[1].Slammer.side);
                //If player is the only player remaining with either hp or non flipped slammer, they win.
                if (gameData.game.players[0].hp.length == 0 && gameData.game.players[0].Slammer.side == 'up') {
                    console.log('player 2 wins');
                };
                if (gameData.game.players[1].hp.length == 0 && gameData.game.players[1].Slammer.side == 'up') {
                    console.log('player 1 wins');
                };
                break;
        }
        if (gameData.game.phase > 5 && gameData.game.stage == 'loop') {
        };
        if (gameData.game.stage == 'end') {
        };
        drawFlippedPogs();
    };

    // Function for end stage
    function stage_end() {
        ctx.fillStyle = 'silver';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '40px Arial';
        ctx.fillText(`Player 1 Hp Stack ${gameData.game.players[0].hp.length}`, 100, 100);
        ctx.fillText(`Player 2 Hp Stack ${gameData.game.players[1].hp.length}`, 100, 200);
        ctx.fillText(gameData.game.stage, 20, 50);
        // if player 1 wins, display player 1 wins
        if (gameData.game.players[1].hp.length == 0 && gameData.game.players[1].Slammer.side == 'up') {
            ctx.fillText(`Player 1 Wins`, 400, 400);
        };
        if (gameData.game.players[0].hp.length == 0 && gameData.game.players[0].Slammer.side == 'up') {
            ctx.fillText(`Player 2 Wins`, 400, 400);
        };
    };

    step();
});

// Listen for player count change event
socket.on('playerCountChange', function (data) {
    // Update the player count
    document.getElementById('readyCount').textContent = `People Ready: ${data.readyCount}/${data.totalCount}`;
});

// Listen for step game error event
socket.on('step-game-error', (data) => {
    // Log the data and error
    console.error('Data:', data);
    console.log('custom test error');
});

// Listen for error event
socket.on('error', (error) => {
    // Log the error
    console.error('An error occurred on the socket:', error);
});