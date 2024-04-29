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

        // Emit 'enterRoom' event and wait for server response
        socket.emit('enterRoom', { name: username, room: roomCode, method: method }, (error) => {
            if (error) { // If there is an error
                alert(error); // Alert the error
            } else { // If there is no error
                // Redirect to the chatroom page
                window.location.href = CHATROOM_URL;
            };
        });
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
        document.querySelector('.form-msg').addEventListener('submit', sendMessage);

        msgInput.addEventListener('keypress', () => {
            socket.emit('activity', username);
        });

        // Retrieve the values from sessionStorage
        username = sessionStorage.getItem('username');
        roomCode = sessionStorage.getItem('roomCode');
        privacy = sessionStorage.getItem('privacy');
        method = sessionStorage.getItem('method');

        switch (method) {
            case 'create':
                console.log('Create method');
                enterRoomCreate();
                sessionStorage.setItem('method', 'join');
                break;
            case 'join':
                console.log('Join method');
                enterRoomJoin();
                sessionStorage.setItem('method', 'join');
                break;
            default:
                console.log('Error: No method given');
        };
    };
});
console.log('Setting window.onload done');

// Function used for when a user leaves a chatroom
function leaveRoom() {
    socket.emit('leaveRoom');
    socket.on('leaveRoomConfirmation', () => {
    });

    window.location.href = LOBBY_URL;
};

// Listen for messages
socket.on('message', (data) => {
    if (window.location.href === CHATROOM_URL) {
        activity.textContent = "";
        const { name, text, id, time } = data;

        const li = document.createElement('li');
        li.className = 'post';
        if (id === socket.id) li.className = 'post post--left';
        if (id !== socket.id && name !== 'YrXoETWEMg5_jKLdAAADtkKSWJqh33L2lrcXAAABWbFLr2OR7EHk719MAAABxkXxW0_R2EuZ7XVXAAAD') li.className = 'post post--right';
        if (name !== 'YrXoETWEMg5_jKLdAAADtkKSWJqh33L2lrcXAAABWbFLr2OR7EHk719MAAABxkXxW0_R2EuZ7XVXAAAD') {
            li.innerHTML = `<div class="post__header ${id === socket.id
                ? 'post__header--user'
                : 'post__header--reply'
                }">
                    <span class="post__header--name">${name}</span>
                    <span class="post__header--time">${time}</span>
                    </div>
                    <div class="post__text">${text}</div>`
        } else {
            li.innerHTML = `<div class ="post__text">${text}</div>`
        };
        document.querySelector('.chat-display').appendChild(li);

        chatDisplay.scrollTop = chatDisplay.scrollHeight;
    };
});

let activityTimer;
socket.on('activity', (name) => {
    activity.textContent = `${name} is typing...`

    // Clear after 3 seconds
    clearTimeout(activityTimer);
    activityTimer = setTimeout(() => {
        activity.textContent = "";
    }, 3000);
});

function showUsers(users) {
    usersList.textContent = '';
    if (users) {
        usersList.innerHTML = `<em>Users in ${roomCode}:</em>`;
        users.forEach((user, i) => {
            usersList.textContent += ` ${user.name}`;
            if (users.length > 1 && i !== users.length - 1) {
                usersList.textContent += ",";
            };
        });
    };
};

socket.on('userList', ({ users }) => {
    showUsers(users);
});

socket.on('joinedRoomFull', () => {
    alert('The room you tried to join is full.');
    window.location.href = LOBBY_URL;
});

socket.on('joinedRoomNotFound', () => {
    alert('The room you tried to join does not exist.');
    window.location.href = LOBBY_URL;
});

// PokePucks Game Code
var blackSide = document.getElementById('blackSide');
var whiteSide = document.getElementById('whiteSide');
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
ctx.font = '20px Arial';
document.getElementById('canvas').width = window.innerWidth;
document.getElementById('canvas').height = window.innerHeight;
ctx.fillStyle = 'silver';
ctx.fillRect(0, 0, canvas.width, canvas.height);

document.getElementById('ready-checkbox').addEventListener('change', function (e) {
    if (e.target.checked) {
        console.log('Ready checkbox checked. Emitting player ready event.');
        socket.emit('player ready', roomCode);
    };
});

socket.on('all players ready', function () {
    console.log('Received all players ready event. Enabling start game button.');
    document.getElementById('start-game-button').disabled = false;
});

socket.on('game started', function () {
    document.getElementById('ready-checkbox').disabled = true;

    // Disable the start game button
    const startGameButton = document.getElementById('start-game-button');
    const stepGameButton = document.getElementById('step-game-button');
    if (startGameButton) {
        startGameButton.disabled = true;
        stepGameButton.disabled = false;
    };
});

function startGameClient() {
    const room = sessionStorage.getItem('roomCode');
    // Disable the start game button
    const startGameButton = document.getElementById('start-game-button');
    if (startGameButton) {
        startGameButton.disabled = true;
    };

    socket.emit('gameStart', room, function (error, response) {
        console.log('does this even run?');
        if (error) {
            console.error(`Error: ${error}`);
        } else {
            console.log('Game started');
        };
    });
    for (let i = 0; i < 8; i++) {
        stepGameClient();
    };
};

function stepGameClient() { // pass the room as a parameter
    const room = sessionStorage.getItem('roomCode');
    // Check that the socket is connected
    console.log(`Socket connected: ${socket.connected}`);
    socket.emit('step-game', room, function (error, response) {
        console.log('socket emitted');
        if (error) {
            console.error(`Error: ${error}`);
        } else if (response.status === 'error') {
            console.error(`Error: ${response.message}`);
        } else {
            console.log(`Step game success for room: ${room}`);
            console.log(response.gameData); // log the game data received from the server
        };
    });
    console.log(`Room: ${room}`);
};

socket.on('step-game-success', (data, gameData) => {
    console.log('Data:', data);
    console.log('custom test success');
    console.log('Game Data:', gameData);

    // Gets the current player
    let currentPlayer;
    try { // Try to get the current player
        currentPlayer = gameData.usersInRoom[gameData.game.turn].name;
    } catch (error) { // If there is an error
        console.error('Invalid turn index:', gameData.game.turn);

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

                __________________________________
// Sergio testing resolving #101



                let logY = 300; // Y position for the log messages on the canvas
                let collectedPogsPlayer1 = document.getElementById('CollectedPogsPlayer1');
                let collectedPogsPlayer2 = document.getElementById('CollectedPogsPlayer2');


                ctx.drawImage(document.getElementById('blackSide'), 2000, 80, 100, 100);
                console.log('Testing for loop 3');
                console.log(gameData.game.arena.length);
                for (let i = 0; i < gameData.game.arena.length; i++) {
                    let pog = gameData.game.arena[i];

                    collectedPogsPlayer1.value += "Pog Taken: " + pog.name + '\n';

                    // Display the message on the canvas
                    let message = 'Pog taken: ' + pog.name;
                    ctx.font = '20px Arial';
                    ctx.fillStyle = 'black';
                    ctx.fillText(message, 10, logY);
                    logY += 20; // Move the Y position down for the next message
                }
                // Function to add a pog to a player's inventory
                function addToInventory(player, pog) {
                    // Check if the player has an inventory property
                    if (!player.inventory) {
                        player.inventory = [];
                    }

                    // Add the pog to the player's inventory
                    player.inventory.push(pog);
                }

                // Function to select a pog
                function selectPog(player, pogIndex) {
                    // Remove the pog from the arena
                    let selectedPog = gameData.game.arena.splice(pogIndex, 1)[0];

                    // Add the pog to the player's inventory
                    addToInventory(player, selectedPog);

                    // Update the textarea for the player
                    let collectedPogs = player === player1 ? collectedPogsPlayer1 : collectedPogsPlayer2;
                    collectedPogs.value += "Pog Taken: " + selectedPog.name + '\n';

                    // Display the selected pog on the canvas
                    let message = 'Pog taken: ' + selectedPog.name;
                    ctx.font = '20px Arial';
                    ctx.fillStyle = 'black';
                    ctx.fillText(message, 10, logY);
                    logY += 20; // Move the Y position down for the next message
                }

                // Use the function to add a pog to a player's inventory
                // Replace 'player' with the actual player object and 'pog' with the actual pog object
                // addToInventory(player, pog);

                // Use the function to select a pog for a player
                // Replace 'player' with the actual player object and 'selectedPogIndex' with the index of the selected pog
                // selectPog(player, selectedPogIndex);
                __________________________________


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
    };

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

socket.on('step-game-error', (data) => {
    console.error('Data:', data);
    console.log('custom test error');
});

socket.on('error', (error) => {
    console.error('An error occurred on the socket:', error);
});