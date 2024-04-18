/****************************** Script Header ******************************\
Project: PokePucks
Author: Brandon Camacho
Editors: Brandon Camacho, Logan Cruz

<Description>
Code for the backend server-side for the PokePucks game.
\***************************************************************************/
/*
// A list for all the required node modules to install or just use npm i by itself to install all of them since they are all listed in the package.json file
// Make sure terminal is in the server folder
npm i socket.io
npm i express
npm i jsonwebtoken
npm i express-session
npm i ejs
npm i os
npm i -D nodemon (Not required but makes editing this file much more convenient. Nodemon will restart the server automatically every time you save the server.)
// Start the server by using 'npm start' while in the server folder
// Start the server for testing by using 'npm run dev' while in the server folder
// Remember to change the ip address for your formbar instance in the AUTH_URL variable
*/

// Importing the required modules
import express from 'express';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import session from 'express-session';
import os from 'os';

// Function to get the local IP address of the computer the server will be running on
function getLocalIP() {
    // Get the network interfaces of the computer
    const interfaces = os.networkInterfaces();
    // Iterate over the interfaces
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Check if the interface is an IPv4 address and not an internal address
            if (iface.family === 'IPv4' && !iface.internal) {
                // Return the IPv4 address
                return iface.address;
            };
        };
    };
    // If no address is found, return localhost
    return 'localhost';
};

// Sets IP_ADDRESS to the local IP address of the computer the server will be running on
const IP_ADDRESS = getLocalIP();

// Constant for the port the server will run on
const PORT = process.env.PORT || 3000;

// Constants for the OAuth and redirect URLs
const AUTH_URL = `http://172.16.3.162:420/oauth`; // `http://ipAddressOfFormbarInstance:port/oauth`;
const THIS_URL = `http://${IP_ADDRESS}:${PORT}/login`; // `http://ipAddressOfThisServer:port/login`;
const GAME_URL = `http://${IP_ADDRESS}:${PORT}/`; // `http://ipAddressOfThisServer:port/`;

// Constants for the file paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* Constant for admin username. 
Make sure admin username is longer than maximum possible username length since its used for foramtting the admin messages
and if a user has the exact same name as the admin username,
their messages are formatted like if they were an admin.
 */
const ADMIN = "YrXoETWEMg5_jKLdAAADtkKSWJqh33L2lrcXAAABWbFLr2OR7EHk719MAAABxkXxW0_R2EuZ7XVXAAAD";

// Arrays to hold all active rooms
var allActiveRooms = [];
var allActivePublicRooms = [];

// Constant for the maximum number of players allowed in a room
const maxPlayers = 2;

// Map to hold all players that have readied up
var readyPlayers = new Map();

// Defines app as the express module
const app = express(); // Our express server is referred to as app

// Sets the view engine to ejs
app.set('view engine', 'ejs');

// Middleware
app.use(
    express.json(), // Allows us to parse JSON data
    express.static(path.join(__dirname, "views")), // Defines our static folder so when we get a request to the root domain, it will send eveything to the public directory that will contain the static assets
    session({
        secret: 'super secret string', // replace with environemnt variable later
        resave: false,
        saveUninitialized: false
    }));

// This endpoint handles GET requests to the root URL ('/'). 
app.get('/', (req, res) => {
    // Check if user is already logged in
    if (req.session && req.session.user) {
        // User is logged in, redirect to chatroom lobby
        res.redirect('/lobby');
    } else {
        // User is not logged in, render the login page
        res.render('login');
    };
});

// This endpoint handles GET requests to the lobby URL ('/lobby'). 
app.get('/lobby', (req, res) => {
    // Check if user is logged in
    if (req.session && req.session.user) {
        // User is logged in, render the chatroom lobby with the username
        res.render('lobby', { sessionUser: req.session.user, activeRooms: allActivePublicRooms });
    } else {
        // User is not logged in, redirect to root
        res.redirect('/');
    };
});

// This endpoint handles GET requests to the chatroom URL ('/chatroom'). 
app.get('/chatroom', (req, res) => {
    // Check if user is logged in
    if (req.session && req.session.user) {
        // User is logged in, render the chatroom
        res.render('chatroom');
    } else {
        // User is not logged in, redirect to root
        res.redirect('/');
    };
});

// This endpoint handles GET requests to the login URL ('/login'). 
app.get('/login', (req, res) => {
    // Check if user is already logged in
    if (req.session && req.session.user) {
        // User is logged in, redirect to chatroom
        res.redirect('/lobby');
    } else {
        // User is not logged in, check if token is present in query string
        if (req.query.token) {
            // Token is present, decode and store in session
            let tokenData = jwt.decode(req.query.token); // Decode the token
            req.session.token = tokenData; // Store the token in the session
            req.session.user = tokenData.username; // Store the username in the session

            // Redirect to lobby
            res.redirect('/lobby');
        } else {
            // Token is not present, redirect to OAuth login
            res.redirect(`${AUTH_URL}?redirectURL=${THIS_URL}`);
        };
    };
});

// This endpoint handles GET requests to the logout URL ('/logout'). 
app.get('/logout', (req, res) => {
    // Destroy the session and redirect to login
    req.session.destroy((err) => {
        // Check for errors
        if (err) {
            return console.log(err);
        };
        // Redirect to root
        res.redirect('/');
    });
});

// Starts the express server on the specified port
// 'app.listen' function binds and listens for connections on the specified host and port
const expressServer = app.listen(PORT, () => {
    console.log(`listening on port ${PORT}`);
});

// Object to hold the state of the users
const UsersState = {
    // Array to hold all the users
    users: [],
    // Function to add a user to the users array
    setUsers: function (newUsersArray) {
        // Set the users array to the new array
        this.users = newUsersArray;
    },
};

// Grabs the server imported from socket.io, gives it the expressServer, and gives it options
const io = new Server(expressServer, {
    // cors stands for cross-origin resource sharing
    cors: {
        // Origin allows you to change what is accepted and what is blocked
        origin: process.env.NODE_ENV === "production" ? false : ["http://localhost:3000", GAME_URL] // Looks at the node environment. If the node environemnt equals production, origin is set to false because we don't want anyone outside of the domain the server is currently on to access it. If it doesn't equal production, origin is set to the address that we will allow to access our socket.io server
    },
});

// Create a map to hold game instances for each room
const games = new Map();

// Once a connection is established, listen for a socket
io.on('connection', socket => {
    console.log(`User ${socket.id} connected`);

    // Upon connection, send a welcome message to the user
    socket.emit('message', buildMsg(ADMIN, "Welcome to Chat App!"));

    // Event handler for 'enterRoom', triggered when a user attempts to enter a room.
    // The event handler recieves an object containing the user's name, room, privacy, and method of entering the room.
    socket.on('enterRoom', ({ name, room, privacy, method }, callback) => {
        console.log(`${name} is entering room: ${room}`);

        // Get the previous room the user was in
        const prevRoom = getUser(socket.id)?.room;

        // If the user was in a previous room
        if (prevRoom) {
            // Leave the previous room
            socket.leave(prevRoom);
            // Emit a message to the previous room that the user has left
            io.to(prevRoom).emit('message', buildMsg(ADMIN, `${name} has left the room`));
        };

        // Activate the user in the new room
        const user = activateUser(socket.id, name, room);

        // If the user was in a previous room
        if (prevRoom) {
            // Update the user list for the previous room
            io.to(prevRoom).emit('userList', {
                // Get the users in the previous room
                users: getUsersInRoom(prevRoom),
            });
        };

        // If user is creating a room, user creates and joins the room like normal
        if (method === 'create') {
            console.log('create room start test');

            // Join room
            socket.join(user.room);

            // Emit a message to the user that they have joined the room
            socket.emit('message', buildMsg(ADMIN, `You have joined the ${user.room} chat room`));

            // Emit a message to the room that the user has joined
            socket.broadcast.to(user.room).emit('messsage', buildMsg(ADMIN, `${user.name} has joined the room`));

            // Update user list for room
            io.to(user.room).emit('userList', {
                // Get the users in the room
                users: getUsersInRoom(user.room),
            });

            // Add the room to the list of active rooms
            allActiveRooms.push(room);
            allActivePublicRooms.push(room);

            // If the room is private
            if (privacy === 'private') {
                // Remove the room from the public rooms array
                allActivePublicRooms.splice(allActivePublicRooms.indexOf(room), 1);
            };

            // Update the rooms list for everyone
            io.emit('roomList', {
                // Get the list of public rooms
                rooms: allActivePublicRooms,
            });

            console.log(`# of Users in room after create: ${getUsersInRoom(user.room).length}`);

            console.log('create room end test');
        };

        // If user is joining a room
        if (method === 'join') {
            console.log('join room start test');

            // Variable to check if the room exists
            let roomExists = false;

            // Iterate over all active rooms
            for (let i = 0; i < allActiveRooms.length; i++) {
                // If the room exists
                if (allActiveRooms[i] === room) {
                    console.log("Room:", room);
                    console.log('Room Exists');

                    // Set roomExists to true
                    roomExists = true;
                    break;
                };
            };

            // If the room exists
            if (roomExists) {
                console.log('Room Exists');

                // If the room is not full
                if (getUsersInRoom(user.room).length <= maxPlayers) {
                    // Join the room
                    socket.join(user.room);

                    console.log(`# of Users in room after Join: ${getUsersInRoom(user.room).length}`);

                    // Emit a message to the user that they have joined the room
                    socket.emit('message', buildMsg(ADMIN, `You have joined the ${user.room} chat room`));
                    // Emit a message to the room that the user has joined
                    io.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has joined the room`));

                    // Update user list for room
                    io.to(user.room).emit('userList', {
                        // Get the users in the room
                        users: getUsersInRoom(user.room),
                    });

                    // If a room is private
                    if (privacy === 'private') {
                        // Remove the room from the public rooms array
                        allActivePublicRooms.splice(allActivePublicRooms.indexOf(room), 1);
                    };

                    // Update rooms list for everyone
                    io.emit('roomList', {
                        // Get the list of public rooms
                        rooms: allActivePublicRooms,
                    });

                    if (callback) callback(); // No error
                } else { // Room is full
                    socket.emit('joinedRoomFull'); // Emit an event to the user that the room is full
                    return;
                };
            } else { // Room does not exist
                console.log('Room does not exist');
                socket.emit('joinedRoomNotFound'); // Emit an event to the user that the room was not found
                return;
            };
            console.log('join room end test');
        };

        // Server-side game logic
        let gameStarted = new Map(); // Map to hold the game started status for each room

        // Goes through the steps of the game
        socket.on('step-game', function (room, callback) {
            console.log('step-game test');

            // Constant for the game instance for the room
            const game = games.get(room);
            if (game) { // If a game instance exists for the room
                try { // Try to step the game
                    // Step the game
                    game.step();
                    let gameData = { // Data to send to the client
                        // Game instance which holds all the game data for that instance
                        game: game,
                    };
                    callback(null, { status: 'success' }); // No error
                    // Emit an event to the room that the game was stepped successful
                    io.to(room).emit('step-game-success', { status: 'success' }, gameData);
                } catch (error) { // Catch any errors
                    // Emit an event to the room that the game was stepped unsuccessful
                    callback(error.message);
                };
            } else { // If a game instance does not exist for the room
                // Emit an event to the room that no game was found for the room
                callback('No game found for this room');
            };
        });

        // Event handler for 'gameStart', triggered when a user starts a game
        socket.on('gameStart', () => {
            // Logic for starting the game
            if (gameStarted.get(room)) { // If the game has already started
                // Emit an event to the room that the game has already started
                callback('Game already started');
            } else { // If the game has not started
                gameStarted.set(room, true); // Set the game started status to true
                io.to(room).emit('game started'); // Emit an event to the room that the game has started
                console.log('gameStart test');

                // Function to compare two objects for equality by converting them to JSON strings.
                function objectsAreEqual(a, b) {
                    // Return if the JSON string of the first object is equal to the JSON string of the second object
                    return JSON.stringify(a) === JSON.stringify(b);
                };

                /**************************************************************
                 * This is the code for the game side of PokePucks. 
                 * The classes create the player, Pucks, slammers, and the game between code lines 328 and 369.
                 * The Game has three stages. Setup, Loop, and End.
                 * Setup is where the players are decided, special rules are decided, health stacks are built, the arena is built, and the slammers are picked,between code lines 371 and 442.
                 * Loop is where the game is played. 
                 * Loop has 6 phases. Top off, Knockout, Count Attacks, Make Attacks, Discard Pucks, and Check for Winner.
                 * Top off is where the arena is filled with pucks from the player's health stacks, in code lines 444 to 490
                 * Knockout is where the player's slammers are placed in the center if they have no pucks in their health stacks, in code lines 492 to 507.
                 * Count Attacks is where the players get the minimum of 1 attack in code lines 509 to 518.
                 * Make Attacks is where the players make their attacks and flip pucks in the arena, in code lines 520 to 617.
                 * Discard Pucks is where the players can use pucks and remove them from the arena and place them in the discard pile, in code lines 619 to 631.
                 * Check for Winner is where the game checks if a player has won, in code lines 633 to 654.
                 * End is where the game ends and the winner is displayed.in code lines 656 to 673.
                 * 
                 * 
                 * Future Plans:
                 * -Have a unique way of allowing the players to throw their slammers at the stack of pucks.
                 * -Have special abilities for slammers.
                 * -Have special abilities for pucks.
                 * -Show the custom pogs in canvas.
                 * -Have more than two players play the game
                 * -Optimize the code
                 * -Make the game more visually appealing
                 * -Add more features to the game
                 */

                var tempArena = [];
                var turn;

                class Player {
                    constructor(hp, power, prize, attack, slammer) {
                        this.hp = hp;
                        this.power = power;
                        this.prize = prize;
                        this.attack = attack;
                        this.slammer = slammer;
                    };
                };

                class Puck {
                    constructor(name, weight, side) {
                        this.name = name;
                        this.weight = weight;
                        this.side = side;
                    };
                    flip() {
                        // flip
                        let power;
                        power = Math.floor(Math.random() * 100) + 1 + this.weight;
                        if (power > 100) {
                            power = 100;
                        };
                        return power;
                    };
                };

                // Initialize the game 
                const Pucks = [
                    {
                        name: "You",
                        ids: [],
                        type: "Trainer",
                        subtype: "",
                        found: "lottery",
                        img: "",
                        description: "This is you",
                        se: {
                            adventure: [],
                            battle: [{
                                text: "If this is the only trainer Puck in your Power stack when you finish an attack, if that throw didn't hit, you make 1 additional attack.",
                                notes: []
                            }]
                        }
                    },
                    {
                        name: "Officer Hicks",
                        ids: [],
                        type: "Trainer",
                        subtype: "",
                        found: "lottery",
                        img: "",
                        description: "Officer Hicks is tasked with finding students leaving school early to have Pokemon battles.",
                        se: {
                            adventure: [],
                            battle: [{
                                text: "After the previous player makes an attack on their turn, before picking up pucks, if any pucks landed outside of the Arena, the previous player must move 1 puck from their Health Stack to the Arena Stack.",
                                notes: []
                            }]
                        }
                    },
                    {
                        name: "Mr. Merkert",
                        ids: [],
                        type: "Trainer",
                        subtype: "",
                        found: "lottery",
                        img: "",
                        description: "One of the trainers you will find along your way.",
                        se: {
                            adventure: [],
                            battle: [{
                                text: "if this is the only Trainer Puck in your Power stack after you have made your last attack and you did not pick up and pucks this turn, you may make 1 additional attack",
                                notes: []
                            }]
                        }
                    },
                    {
                        name: "Mr. Saia",
                        ids: [],
                        type: "Trainer",
                        subtype: "",
                        found: "lottery",
                        img: "",
                        description: "One of the trainers you will find along your way.",
                        se: {
                            adventure: [],
                            battle: [{
                                text: "If this is the only Trainer Puck in your Power stack when previous player finishes making a throw, you may move a flipped puck to your Health stack and move a puck from your Health stack into the Arena face-up. ",
                                notes: []
                            }]
                        }
                    },
                    {
                        name: "Mr. Smith",
                        ids: [],
                        type: "Trainer",
                        subtype: "",
                        found: "lottery",
                        img: "",
                        description: "One of the trainers you will find along your way.",
                        se: {
                            adventure: [],
                            battle: [{
                                text: "If this is the only Trainer Puck in your Power stack when you finish topping-off, you may rearrange the Arena stack. ",
                                notes: []
                            }]
                        }
                    },
                    {
                        name: "Bike",
                        ids: [],
                        type: "Item", // Item, Trainer, Energy, Pokemon
                        subtype: "", // Unofficial category of puck
                        found: "mart", // Mart, Discovery, Lottery
                        img: "",
                        description: "A little pricey, but there's no better way for a trainer to zip around the world.",
                        se: {
                            adventure: [{
                                text: "When you make a move action, you may make one additional move action at no cost.",
                                notes: ["Obviously, the free move action does not receive another free move."]
                            }],
                            battle: [{
                                text: "After making a throw, if this puck is flipped, the current player moves it to their prize stack.",
                                notes: ["This does not count towards the number of pucks the player is allowed to pick up."]
                            }]
                        }
                    },
                    {
                        name: "Fishing Rod",
                        ids: [],
                        type: "Item",
                        subtype: "",
                        found: "discovery",
                        img: "",
                        description: "A superb tool for relaxation, unless you are a hungry and unwitting water type Pokemon",
                        se: {
                            adventure: [{
                                text: "You require a Fishing Rod to start a Catch Pokemon action for a Pokemon Slammer Type of Water. In addition, you may start said Catch Action if you are in a Zone with a connection that requires 'Surf' to get to the Zone where the Pokemon is located.",
                                notes: ["Example: If you are in Route 19, you may catch a Pokemon located in Route 20 if you possess this puck, even if you do not have Surf and a Water Type Pokemon.", "Vaporeon may be evolved from Eevee with Water Stones without a Fishing Rod, because it is not a Catch Action."]
                            }],
                            battle: [{
                                text: "After making a throw, if this puck is flipped, the current player moves it to their prize stack.",
                                notes: ["This does not count towards the number of pucks the player is allowed to pick up."]
                            }]
                        }
                    },

                    {
                        name: "Potions",
                        ids: [],
                        type: "Item",
                        subtype: "",
                        found: "mart",
                        img: "",
                        description: "Brings 2 pokemon into your deck to battle.",
                        se: {
                            adventure: [],
                            battle: [{
                                text: "Before you top-off, you may move up to 2 pucks from Prize stack onto your Health stack without going over the max size, then discard this puck. ",
                                notes: [""]
                            }]
                        }
                    },
                    {
                        name: "Switch",
                        ids: [],
                        type: "Item",
                        subtype: "",
                        found: "mart",
                        img: "",
                        description: "Switch's out your current pokemon for another.",
                        se: {
                            adventure: [],
                            battle: [{
                                text: "Before determining the number of attacks to make on your turn, you may move your current Slammer to your Bench Stack, and select a different Slammer.",
                                notes: [""]
                            }]
                        }
                    },
                    {
                        name: "Berry",
                        ids: [],
                        type: "Item",
                        subtype: "",
                        found: "mart",
                        img: "",
                        description: "Rejuvanates your pokemon to keep them in the fight.",
                        se: {
                            adventure: [],
                            battle: [{
                                text: "When you pick up this puck, if your Health stack has less pucks than its max size, you may move this puck to your Health stack. ",
                                notes: []
                            }]
                        }
                    },
                    {
                        name: "Focus Energy",
                        ids: [],
                        type: "Item",
                        subtype: "",
                        found: "mart",
                        img: "",
                        description: "A blast of type energy that powers up you Pokemon a lot for a short bit.",
                        se: {
                            adventure: [],
                            battle: [{
                                text: "When counting the number of attacks to make on your turn, you may discard this puck. If you do, add 2 to that number.",
                                notes: ["A Focus Energy is any other Energy subtype puck with a fully transparent bottom."]
                            }]
                        }
                    },
                    {
                        name: "Electric Energy",
                        ids: [],
                        type: "Item",
                        subtype: "Energy",
                        found: "mart",
                        img: "",
                        description: "Type energy that powers up your Pokemon's attacks.",
                        se: {
                            adventure: [],
                            battle: [{
                                text: "When counting the number of attacks to make on your turn, if your current Pokemon Slammer's Energy Type is Electric, add 1 to that number",
                                notes: []
                            }]
                        }
                    },
                    {
                        name: "Water Energy",
                        ids: [],
                        type: "Item",
                        subtype: "Energy",
                        found: "mart",
                        img: "",
                        description: "Type energy that powers up your Pokemon's attacks.",
                        se: {
                            adventure: [],
                            battle: [{
                                text: "When counting the number of attacks to make on your turn, if your current Pokemon Slammer's Energy Type is Water, add 1 to that number",
                                notes: []
                            }]
                        }
                    },
                    {
                        name: "Fire Energy",
                        ids: [],
                        type: "Item",
                        subtype: "Energy",
                        found: "mart",
                        img: "",
                        description: "Type energy that powers up your Pokemon's attacks.",
                        se: {
                            adventure: [],
                            battle: [{
                                text: "When counting the number of attacks to make on your turn, if your current Pokemon Slammer's Energy Type is Fire, add 1 to that number",
                                notes: []
                            }]
                        }
                    },
                    {
                        name: "Grass Energy",
                        ids: [],
                        type: "Item",
                        subtype: "Energy",
                        found: "mart",
                        img: "",
                        description: "Type energy that powers up your Pokemon's attacks.",
                        se: {
                            adventure: [],
                            battle: [{
                                text: "When counting the number of attacks to make on your turn, if your current Pokemon Slammer's Energy Type is Grass, add 1 to that number",
                                notes: []
                            }]
                        }
                    },
                    {
                        name: "Fighting Energy",
                        ids: [],
                        type: "Item",
                        subtype: "Energy",
                        found: "mart",
                        img: "",
                        description: "Type energy that powers up your Pokemon's attacks.",
                        se: {
                            adventure: [],
                            battle: [{
                                text: "When counting the number of attacks to make on your turn, if your current Pokemon Slammer's Energy Type is Fighting, add 1 to that number",
                                notes: []
                            }]
                        }
                    },
                    {
                        name: "Psychic Energy",
                        ids: [],
                        type: "Item",
                        subtype: "Energy",
                        found: "mart",
                        img: "",
                        description: "Type energy that powers up your Pokemon's attacks.",
                        se: {
                            adventure: [],
                            battle: [{
                                text: "When counting the number of attacks to make on your turn, if your current Pokemon Slammer's Energy Type is Psychic, add 1 to that number",
                                notes: []
                            }]
                        }
                    },
                    {
                        name: "Normal Energy",
                        ids: [],
                        type: "Item",
                        subtype: "Energy",
                        found: "mart",
                        img: "",
                        description: "Type energy that powers up your Pokemon's attacks.",
                        se: {
                            adventure: [],
                            battle: [{
                                text: "When counting the number of attacks to make on your turn, if your current Pokemon Slammer's Energy Type is Normal, add 1 to that number",
                                notes: []
                            }]
                        }
                    },
                    {
                        name: "Fairy Energy",
                        ids: [],
                        type: "Item",
                        subtype: "Energy",
                        found: "mart",
                        img: "",
                        description: "Type energy that powers up attacks of many different types of Pokemon.",
                        se: {
                            adventure: [],
                            battle: [{
                                text: "When counting the number of attacks to make on your turn, if your current Pokemon Slammer's Energy Type is Water, Grass, or Normal, add 1 to that number",
                                notes: []
                            }]
                        }
                    },
                    {
                        name: "Dark Energy",
                        ids: [],
                        type: "Item",
                        subtype: "Energy",
                        found: "mart",
                        img: "",
                        description: "Type energy that powers up attacks of many different types of Pokemon.",
                        se: {
                            adventure: [],
                            battle: [{
                                text: "When counting the number of attacks to make on your turn, if your current Pokemon Slammer's Energy Type is Psychic, Fire, or Normal, add 1 to that number",
                                notes: []
                            }]
                        }
                    },
                    {
                        name: "Steel Energy",
                        ids: [],
                        type: "Item",
                        subtype: "Energy",
                        found: "mart",
                        img: "",
                        description: "Type energy that powers up attacks of many different types of Pokemon.",
                        se: {
                            adventure: [],
                            battle: [{
                                text: "When counting the number of attacks to make on your turn, if your current Pokemon Slammer's Energy Type is Electric, Fighting, or Normal, add 1 to that number",
                                notes: []
                            }]
                        }
                    },
                    {
                        name: "Dragon Energy",
                        ids: [],
                        type: "Item",
                        subtype: "Energy",
                        found: "mart",
                        img: "",
                        description: "Type energy that powers up attacks of all different types of Pokemon.",
                        se: {
                            adventure: [],
                            battle: [{
                                text: "If there is another Energy puck in your Power Stack whose type that matches your current Pokemon Slammer's Energy Type, in each attack in your turn, when counting the number of pucks to pick up, add 1 to that number. Otherwise, when counting the number of attacks to make on your turn, add 1 to that number.",
                                notes: [
                                    "A Squirtle with a Dragon Energy makes two attacks. A Squirtle with a Water Energy and Dragon Energy makes two attacks and picks up two pucks from each."
                                ]
                            }]
                        }
                    },
                    {
                        name: "Full Heal",
                        ids: [],
                        type: "Item",
                        subtype: "",
                        found: "mart",
                        img: "",
                        description: "Removes all statuses from one of your pokemon.",
                        se: {
                            adventure: [],
                            battle: [{
                                text: "At the beginning of your Count Attacks phase, you may discard this puck. If you do, choose one Status your current Slammer has. Your current Slammer loses that Status.",
                                notes: [""]
                            }]
                        }
                    },
                    {
                        name: "Focus Sash",
                        ids: [],
                        type: "Item",
                        subtype: "",
                        found: "mart",
                        img: "",
                        description: "A good tool to make sure your pokemon will keep fighting",
                        se: {
                            adventure: [],
                            battle: [{
                                text: "Before you top-off, if this item is in your Power stack, you may reduce the max size of the Arena stack to equal the number of pucks in the Arena stack plus the number of pucks in your Health stack, then discard this puck.",
                                notes: []
                            }]
                        }
                    },
                    {
                        name: "PokeFlute",
                        ids: [],
                        type: "Item",
                        subtype: "",
                        found: "Discovery",
                        img: "",
                        description: "Awakens your pokemon.",
                        se: {
                            adventure: [],
                            battle: [{
                                text: "At the beginning of your Count Attacks phase, if your current Slammer has the Sleep Status, it loses the Sleep Status.",
                                notes: [""]
                            }]
                        }
                    },
                    {
                        name: "Moon Stone",
                        ids: [],
                        type: "Item",
                        subtype: "Power Stone",
                        found: "mart",
                        img: "",
                        description: "If the power stone is the same type as your pokemon, it makes those moves stronger.",
                        se: {
                            adventure: [],
                            battle: [{
                                text: "After counting the number of attacks to make on your turn, if your current Pokemon Slammer's Energy Type is Normal, you may choose to discard this puck. If you do, in each attack this turn, when counting the number of pucks to pick up, add 1 to that number.",
                                notes: [""]
                            }]
                        }
                    },
                    {
                        name: "Thunder Stone",
                        ids: [],
                        type: "Item",
                        subtype: "Power Stone",
                        found: "mart",
                        img: "",
                        description: "If the power stone is the same type as your pokemon, it makes those moves stronger.",
                        se: {
                            adventure: [],
                            battle: [{
                                text: "After counting the number of attacks to make on your turn, if your current Pokemon Slammer's Energy Type is Electric, you may choose to discard this puck. If you do, in each attack this turn, when counting the number of pucks to pick up, add 1 to that number.",
                                notes: [""]
                            }]
                        }
                    },
                    {
                        name: "Leaf Stone",
                        ids: [],
                        type: "Item",
                        subtype: "Power Stone",
                        found: "mart",
                        img: "",
                        description: "If the power stone is the same type as your pokemon, it makes those moves stronger.",
                        se: {
                            adventure: [],
                            battle: [{
                                text: "After counting the number of attacks to make on your turn, if your current Pokemon Slammer's Energy Type is Grass, you may choose to discard this puck. If you do, in each attack this turn, when counting the number of pucks to pick up, add 1 to that number.",
                                notes: [""]
                            }]
                        }
                    },
                    {
                        name: "Water Stone",
                        ids: [],
                        type: "Item",
                        subtype: "Power Stone",
                        found: "mart",
                        img: "",
                        description: "If the power stone is the same type as your pokemon, it makes those moves stronger.",
                        se: {
                            adventure: [],
                            battle: [{
                                text: "After counting the number of attacks to make on your turn, if your current Pokemon Slammer's Energy Type is Water, you may choose to discard this puck. If you do, in each attack this turn, when counting the number of pucks to pick up, add 1 to that number.",
                                notes: [""]
                            }]
                        }
                    },
                    {
                        name: "Fire Stone",
                        ids: [],
                        type: "Item",
                        subtype: "Power Stone",
                        found: "mart",
                        img: "",
                        description: "If the power stone is the same type as your pokemon, it makes those moves stronger.",
                        se: {
                            adventure: [],
                            battle: [{
                                text: "After counting the number of attacks to make on your turn, if your current Pokemon Slammer's Energy Type is Fire, you may choose to discard this puck. If you do, in each attack this turn, when counting the number of pucks to pick up, add 1 to that number.",
                                notes: [""]
                            }]
                        }
                    },
                    {
                        name: "Old Amber",
                        ids: [],
                        type: "Item",
                        subtype: "Power Stone",
                        found: "mart",
                        img: "",
                        description: "If the power stone is the same type as your pokemon, it makes those moves stronger.",
                        se: {
                            adventure: [],
                            battle: [{
                                text: "After counting the number of attacks to make on your turn, if your current Pokemon Slammer's Energy Type is Fighting, you may choose to discard this puck. If you do, in each attack this turn, when counting the number of pucks to pick up, add 1 to that number.",
                                notes: [""]
                            }]
                        }
                    },
                    {
                        name: "Dusk Stone",
                        ids: [],
                        type: "Item",
                        subtype: "Power Stone",
                        found: "mart",
                        img: "",
                        description: "If the power stone is the same type as your pokemon, it makes those moves stronger.",
                        se: {
                            adventure: [],
                            battle: [{
                                text: "After counting the number of attacks to make on your turn, if your current Pokemon Slammer's Energy Type is Psychic, you may choose to discard this puck. If you do, in each attack this turn, when counting the number of pucks to pick up, add 1 to that number.",
                                notes: [""]
                            }]
                        }
                    },
                    {
                        name: "Silph Scope",
                        ids: [],
                        type: "Item",
                        subtype: "",
                        found: "discovery",
                        img: "",
                        description: "",
                        se: {
                            adventure: [],
                            battle: [{
                                text: "After counting the number of attacks you can make on your turn, if you can only make 1 attack that turn, when counting the numebr of pucks you can pick up in that attack, increase that number by 1.",
                                notes: [""]
                            }]
                        }
                    },
                    {
                        name: "HM01 Cut",
                        ids: [],
                        type: "Item",
                        subtype: "",
                        found: "discovery",
                        img: "",
                        description: "",
                        se: {
                            adventure: [],
                            battle: [{
                                text: "If your current Slammer's Energy Type is Grass, in each of your attacks on your turn, when counting the number of pucks to pick up, add 1 to that number.",
                                notes: [""]
                            }]
                        }
                    },
                    {
                        name: "HM02 Fly",
                        ids: [],
                        type: "Item",
                        subtype: "",
                        found: "discovery",
                        img: "",
                        description: "",
                        se: {
                            adventure: [{
                                text: "Each time you make a Move Action, if you possess a Pokemon Slammer with a Wing Tag, you may move up to 4 times, but you must finish your Move Action in a City Zone.",
                                notes: [""]
                            }],
                            battle: []
                        }
                    },
                    {
                        name: "HM03 Surf",
                        ids: [],
                        type: "Item",
                        subtype: "",
                        found: "discovery",
                        img: "",
                        description: "",
                        se: {
                            adventure: [],
                            battle: [{
                                text: "Support: Once in your turn, if a Slammer in your Bench Stack has a Water Energy Type, when counting the number of pucks to pick up in the first attack made on your turn, add that Slammer's Ball Strength to that number.",
                                notes: [""]
                            }]
                        }
                    },
                    {
                        name: "HM04 Dig",
                        ids: [],
                        type: "Item",
                        subtype: "",
                        found: "discovery",
                        img: "",
                        description: "",
                        se: {
                            adventure: [],
                            battle: [{
                                text: "If your current Slammer's Energy Type is Fighting, when counting attacks on your turn, you may choose to reduce that number to 1. If you do, you may pick up an additional puck in each of your attacks during your next turn.",
                                notes: [""]
                            }]
                        }
                    },
                ];

                class Slammer {
                    constructor(name, weight, side) {
                        this.name = name;
                        this.weight = weight;
                        this.side = side;
                    };

                    attack() {
                        // attack
                        let att;
                        att = Math.floor(Math.random() * 100)
                        if (att > 100) {
                            att = 100;
                        };
                        return att;
                    };
                };

                class Game {
                    constructor() {
                        this.players = [new Player([], [], [], 0, 'squirtle'), new Player([], [], [], 0, 'bulbasaur')];
                        this.stage = 'setup';
                        this.phase = 0;
                        this.stepcount = 0;
                        this.arena = [];
                        this.turn = 0;
                        this.pickedPucks = [];
                    };

                    step() {
                        switch (this.stage) {
                            case 'setup':
                                this.stage_setup();
                                break;
                            case 'loop':
                                this.stage_loop();
                                break;
                            case 'end':
                                this.stage_end();
                                break;
                            default:
                                break;
                        };
                    };

                    stage_setup() {
                        switch (this.phase) {
                            case 0: // Decide players
                                /****************************************
                                 * This is where the players are decided.
                                 * The turns are decided randomly.
                                 * The players are given a backup of their pogs, just in case their health stack goes undefinded.
                                 * The phase is increased by 1.
                                 */
                                this.phase++;
                                this.turn = Math.floor(Math.random() * 2);
                                console.log(this.players[0]);
                                console.log(this.players[1]);
                                this.players[0].pogsBackup = [];
                                this.players[1].pogsBackup = [];
                                break;
                            case 1: // Decide Special Rules
                                /*`***************************************
                                    * This is where the special rules are decided.
                                    * To be added later.
                                    * The phase is increased by 1.
                                */
                                this.phase++;
                                break;
                            case 2: // Build health stack
                                /****************************************
                                 * This is where the health stacks are built.
                                 * The health stacks are built with 14 pogs.
                                 * The phase is increased by 1.
                                */
                                // for each player, add 14 pogs to their health stack
                                if (this.players[0].hp.length == 0 && this.players[1].hp.length == 0) {
                                    for (let i = 0; i < this.players.length; i++) {
                                        for (let j = 0; j < 15; j++) {
                                            console.log(this.players[i].hp);
                                            this.players[i].hp.push(new Puck('pog', 1, 'down'));
                                        };
                                    };
                                };
                                console.log(this.players[0].hp.length);
                                console.log(this.players[1].hp.length);
                                this.phase++;
                                break;
                            case 3: // Build arena
                                // while arena is < 8, each player pops 1 from hp to arena
                                /***************************************
                                 * This is where the arena is built.
                                 * The arena is built with 8 pogs, by the players health stack, reducing theirs to 11 pogs.
                                 * The phase is increased by 1.
                                */
                                while (this.arena.length < 8) {
                                    this.arena.push(this.players[0].hp.pop());
                                    this.arena.push(this.players[1].hp.pop());
                                };
                                this.phase++;
                                break;
                            case 4: // Pick a slammer
                                // each player picks a slammer
                                /**************************************
                                 * This is where the slammers are picked.
                                 * The slammers are picked by the players.
                                 * The phase is increased by 1.
                                 * The game is set to the loop stage.
                                */
                                this.players[0].Slammer = new Slammer('slammer', 1, 'down');
                                this.players[1].Slammer = new Slammer('slammer', 1, 'down');
                                this.phase++;
                                break;
                        };
                        if (this.phase > 4) {
                            this.stage = 'loop';
                            this.phase = 0;
                        };
                    };

                    stage_loop() {
                        switch (this.phase) {
                            case 0: // Top off
                                /**************************************
                                 * This is where the arena is topped off.
                                 * The arena is topped off with pogs from the players health stacks.
                                 * If a player has no pogs in their health stack, they are placed in critical.
                                 * The phase is increased by 1.
                                */
                                console.log('Arena:', this.arena);
                                console.log('case 0 test');
                                if (this.arena === undefined && this.players[0].hp.length > 0 && this.players[1].hp.length > 0) {
                                    this.arena = [];
                                    for (let i = 0; i < Math.floor(Math.random() * 8) + 1; i++) {
                                        this.arena.push(new Puck('pog', 1, 'down'));
                                    }
                                }
                                console.log(this.players[0].Slammer.side);
                                console.log(this.players[1].Slammer.side);
                                if (this.turn == 0 && this.players[0].hp.length === 0 && this.players[0].pogsBackup.length > 0) {
                                    this.players[0].hp = [...this.players[0].pogsBackup];
                                    this.players[0].pogsBackup = [];
                                };
                                if (this.turn == 1 && this.players[1].hp.length === 0 && this.players[1].pogsBackup.length > 0) {
                                    this.players[1].hp = [...this.players[1].pogsBackup];
                                    this.players[1].pogsBackup = [];
                                };
                                // while arena is < 8, player pops 1 from hp to arena
                                // if player has no pogs in their stack, stop and put into critical
                                // Assuming this.players[0].hp and this.players[1].hp are arrays

                                while (this.arena.length < 8) {
                                    console.log('Arena Length:' + this.arena.length);
                                    console.log('Arena:' + this.arena);
                                    if (this.players[0].hp.length == 0) {
                                        break;
                                    } else if (this.turn == 0) {
                                        if (this.players[0].hp.length > 0) {
                                            let randomIndex = Math.floor(Math.random() * Pucks.length);
                                            let lostPuck = Pucks[randomIndex];
                                            this.players[0].hp.pop();
                                            this.arena.push(lostPuck);
                                            console.log('Player 1 lost puck:', lostPuck.name);
                                        };
                                    };
                                    if (this.players[1].hp.length == 0) {
                                        break;
                                    } else if (this.turn == 1) {
                                        if (this.players[1].hp.length > 0) {
                                            let randomIndex = Math.floor(Math.random() * Pucks.length);
                                            let lostPuck = Pucks[randomIndex];
                                            this.players[1].hp.pop();
                                            this.arena.push(lostPuck);
                                            console.log('Player 2 lost puck:', lostPuck.name);
                                        };
                                    };
                                    console.log('Arena Length End:' + this.arena.length);
                                    console.log('Player 1 HP:' + this.players[0].hp.length);
                                    console.log('Player 2 HP:' + this.players[1].hp.length);
                                };
                                this.phase++;
                                break;
                            case 1:// Knockout
                                /*************************************
                                 * This is where the players are knocked out.
                                 * If a player has no pogs in their stack, move that player's slammer into the center.
                                 * The phase is increased by 1.
                                */

                                if (this.arena === undefined && this.players[0].hp.length > 0 && this.players[1].hp.length > 0) {
                                    this.arena = [];
                                    for (let i = 0; i < Math.floor(Math.random() * 8) + 1; i++) {
                                        this.arena.push(new Puck('pog', 1, 'down'));
                                    }
                                }

                                console.log('case 1 test');
                                console.log(this.players[0].Slammer.side);
                                console.log(this.players[1].Slammer.side);
                                // if player has no pogs in their stack, move that player's slammer into the center.
                                console.log('Before replacing slammer with turn:', this.arena, this.turn);
                                // Before replacing the player's pogs with the slammer, store the pogs
                                if (this.players[0].hp.length <= 0 && this.turn === 1) {
                                    this.players[0].pogsBackup = [...this.players[0].hp];
                                    this.players[0].hp = [];
                                    tempArena = this.arena;
                                    this.arena = [];
                                    this.arena.push(this.players[0].Slammer);
                                };
                                if (this.players[1].hp.length <= 0 && this.turn === 0) {
                                    this.players[1].pogsBackup = [...this.players[1].hp];
                                    this.players[1].hp = [];
                                    tempArena = this.arena;
                                    this.arena = [];
                                    this.arena.push(this.players[1].Slammer);
                                };

                                this.phase++;
                                break;
                            case 2:// Count Attacks
                                /************************************
                                 * This is where the players get the minimum of 1 attack.
                                 * The phase is increased by 1.
                                */
                                console.log('After replacing slammer with turn:', this.arena, this.turn);
                                console.log(this.players[0].Slammer.side);
                                console.log(this.players[1].Slammer.side);
                                //Each player gets the bare minimum of 1 attack, before checking for abilities, status, and other special rules.
                                this.players[0].attacks = 1;
                                this.players[1].attacks = 1;
                                console.log(this.players[0].hp.length);
                                console.log(this.players[1].hp.length);
                                this.phase++;
                                break;
                            case 3://Make Attacks
                                /***********************************
                                 * This is where the players make their attacks.
                                 * The players make their attacks and flip pucks in the arena.
                                 * If a player has no pogs in their stack, the slammer is placed for the attack to see if it flips or not.
                                 * The phase is increased by 1.
                                */
                                console.log('case 3 test');
                                console.log('Arena:', this.arena.hp);
                                console.log(this.players[0].Slammer.side);
                                console.log(this.players[1].Slammer.side);
                                //The current player makes an attack, then the other player makes an attack. Repeat until all attacks have been made. 
                                //If a player has flipped over pogs in the arena, pick them up and place it in prize, the rest that have been knocked
                                // over are placed back into the arena.
                                let power;
                                if (this.turn == 0) {
                                    while (this.players[0].attacks > 0) {
                                        console.log('Player attack Slammer');
                                        console.log(this.players[0].attacks);
                                        power = this.players[this.turn].Slammer.attack();
                                        let slammerInArena = false;
                                        for (let i = 0; i < this.arena.length; i++) {
                                            console.log('Arena Slammer:', this.arena[i]);
                                            console.log('Player Slammer:', this.players[this.turn].Slammer);
                                            if (objectsAreEqual(this.arena[i], this.players[this.turn].Slammer)) {
                                                console.log('Slammer in Arena');
                                                slammerInArena = true;
                                                break;
                                            };
                                        };

                                        console.log('slammerInArena:', slammerInArena);
                                        console.log('this.turn:', this.turn);
                                        if (slammerInArena && this.players[1].hp.length == 0) {
                                            console.log('Player 2 slammer attack test');
                                            let power1 = this.players[1].Slammer.attack();
                                            if (power > power1) {
                                                this.players[1].Slammer.side = 'up';
                                            };
                                        };
                                        console.log('Arena for Player 1:', this.arena);

                                        console.log('Slammer weight:', this.weight);
                                        for (let i = 0; i < this.arena.length; i++) {
                                            if (this.arena[i] && typeof this.arena[i].flip === 'function') {
                                                console.log('Puck weight:', this.arena[i].weight);
                                                let flipnum = this.arena[i].flip();
                                                console.log('power:', power);
                                                console.log('flipnum:', flipnum);
                                                if (power > flipnum) {
                                                    console.log('Puck is flipped');
                                                    this.arena[i].side = 'up';
                                                    console.log(this.arena[i])
                                                    this.players[this.turn].prize.push(this.arena[i]);
                                                    this.arena.splice(i, 1);
                                                    console.log(this.arena[i])
                                                } else {
                                                    console.log(this.arena[i])
                                                    console.log('Puck is not flipped');

                                                }
                                            }
                                        }

                                        this.players[this.turn].attacks--;
                                    };
                                } else {
                                    while (this.players[1].attacks > 0) {
                                        let slammerInArena = false;
                                        for (let i = 0; i < this.arena.length; i++) {
                                            console.log('Arena Slammer:', this.arena[i]);
                                            console.log('Player Slammer:', this.players[this.turn].Slammer);
                                            if (objectsAreEqual(this.arena[i], this.players[this.turn].Slammer)) {
                                                console.log('Slammer in Arena');
                                                slammerInArena = true;
                                                break;
                                            };
                                        }
                                        power = this.players[this.turn].Slammer.attack();
                                        if (slammerInArena && this.players[0].hp.length == 0) {
                                            let power1 = this.players[0].Slammer.attack();
                                            if (power > power1) {
                                                this.players[0].Slammer.side = 'up';
                                            };
                                        };
                                        console.log('Arena for Player 2:', this.arena);

                                        console.log('Slammer weight:', this.weight);
                                        for (let i = 0; i < this.arena.length; i++) {
                                            if (this.arena[i] && typeof this.arena[i].flip === 'function') {
                                                console.log('Puck weight:', this.arena[i].weight);
                                                let flipnum = this.arena[i].flip();
                                                console.log('power:', power);
                                                console.log('flipnum:', flipnum);
                                                if (power > flipnum) {

                                                    console.log('Puck is flipped');
                                                    this.arena[i].side = 'up';
                                                    console.log(this.arena[i])
                                                    this.players[this.turn].prize.push(this.arena[i]);
                                                    this.arena.splice(i, 1);
                                                    console.log(this.arena[i])
                                                } else {
                                                    console.log(this.arena[i])
                                                    console.log('Puck is not flipped');
                                                    ;
                                                }
                                            }
                                        }

                                        this.players[this.turn].attacks--;
                                    };
                                };
                                if (this.turn == 0) {
                                    // Remove the slammer from the arena
                                    const slammerIndex = this.arena.findIndex(pog => pog === this.players[0].Slammer);
                                    if (slammerIndex !== -1) {
                                        this.arena.splice(slammerIndex, 1);
                                    };
                                    // Add the pogs back into the arena from tempArena

                                } else {
                                    // Remove the slammer from the arena
                                    const slammerIndex = this.arena.findIndex(pog => pog === this.players[1].Slammer);
                                    if (slammerIndex !== -1) {
                                        this.arena.splice(slammerIndex, 1);
                                    };
                                }
                                console.log('Arena:', this.arena.hp);
                                if (this.arena === undefined && this.players[0].hp.length > 0 && this.players[1].hp.length > 0) {
                                    let num = Math.floor(Math.random() * 8); + 1;
                                    for (let i = 0; i < num; i++) {
                                        this.arena.push(new Puck('pog', 1, 'down'));
                                    }
                                }
                                this.phase++;
                                break;
                            case 4://Discard pucks
                                /**********************************
                                 * This is where the players can use pucks.
                                 * If a player wants to use a puck, remove that puck from the power stack and place it in the discard pile, while
                                 * checking rules for that puck, and special rules.
                                 * The phase is increased by 1.
                                */
                                console.log('case 4 test');
                                console.log(this.players[0].Slammer.side);
                                console.log(this.players[1].Slammer.side);
                                if (this.turn == 0) {
                                    this.turn = 1;
                                } else {
                                    this.turn = 0;
                                };
                                this.phase++;
                                break;
                            case 5://Check for winner
                                /*********************************
                                 * This is where the game checks for a winner.
                                 * If a player is the only player remaining with either pogs or non flipped slammer, they win.
                                 * The phase is increased by 1.
                                */
                                console.log('case 5 test');
                                console.log(this.players[0].Slammer.side);
                                console.log(this.players[1].Slammer.side);

                                if (this.arena === undefined && this.players[0].hp.length > 0 && this.players[1].hp.length > 0) {

                                    if (this.arena.length == 0 && this.players[0].hp.length > 0 && this.players[1].hp.length > 0) {

                                        let num = Math.floor(Math.random() * 8); + 1;
                                        for (let i = 0; i < num; i++) {
                                            this.arena.push(new Puck('pog', 1, 'down'));
                                        }
                                    }

                                    //If player is the only player remaining with either hp or non flipped slammer, they win.
                                    if (this.players[0].hp.length == 0 && this.players[0].Slammer.side == 'up') {
                                        this.stage = 'end';
                                        console.log('player 2 wins');
                                    };
                                    if (this.players[1].hp.length == 0 && this.players[1].Slammer.side == 'up') {
                                        this.stage = 'end';
                                        console.log('player 1 wins');
                                    };
                                    if (this.arena.length == 0 && this.players[0].hp.length > 0 && this.players[1].hp.length > 0) {
                                        let num = Math.floor(Math.random() * 8); + 1;
                                        for (let i = 0; i < num; i++) {
                                            this.arena.push(new Puck('pog', 1, 'down'));
                                        }
                                    }
                                    console.log('Arena:', this.arena);
                                    this.phase++;
                                    break;

                                };

                                if (this.phase >= 5 && this.stage == 'loop') {
                                    console.log('case 5 test258')
                                    this.stage = 'loop';
                                    this.phase = 0;
                                };
                                if (this.stage == 'end') {
                                    this.phase = 0;
                                };
                        };
                    };
                    stage_end() {
                        /********************
                         * This is where the game ends.
                         * The game ends and the winner is displayed.
                         * The game is reset.
                         */
                        if (this.players[1].hp.length == 0 && this.players[1].Slammer.side == 'up') {
                            console.log('P1 wins');
                        };
                        if (this.players[0].hp.length == 0 && this.players[0].Slammer.side == 'up') {
                            console.log('P2 wins');
                        };
                    };
                };

                // Constant for a new game instance
                const game = new Game();

                // Function to start the game
                function startGame(callback) {
                    // Constant for the game instance for the room
                    const game = games.get(room);
                    // If there is a game instance for the room
                    if (game) {
                        try { // Try to run the game step function
                            // Run the game step function
                            game.step();
                            callback(null, { status: 'success' }); // Return success
                        } catch (error) { // If there is an error
                            // Return the error
                            callback(error.message);
                        };
                    } else { // If there is no game instance for the room
                        // Return that there is no game for the room
                        callback('No game found for this room');
                    };
                    console.log('Game:', game);
                };

                // You need to pass a callback function when you call startGame
                startGame(function (error, result) {
                    if (error) { // If there is an error
                        // Log the error
                        console.error(error);
                    } else { // If there is no error
                        // Log the result
                        console.log(result);
                    }
                });

                // Sets the game instance for the room to the games map
                games.set(user.room, game);
                console.log('Games Map:', games);
                console.log('gameEnd test');
            };
        });
    });

    // When player is ready
    socket.on('player ready', function (room, callback) {
        // If the room is not in the readyPlayers map
        if (!readyPlayers.has(room)) {
            // Set the room in the readyPlayers map to an empty array
            readyPlayers.set(room, []);
        };

        // Push the player's id to the room in the readyPlayers map
        readyPlayers.get(room).push(socket.id);

        console.log(readyPlayers.get(room));
        console.log(readyPlayers);
        console.log(`Player ${socket.id} is ready in room ${room}. Total ready players: ${readyPlayers.get(room).length}`);

        let roomSize = getUsersInRoom(room).length; // Get the number of users in the room
        if (roomSize >= 2 && readyPlayers.get(room).length === roomSize) { // If there are at least 2 users in the room and all users are ready
            console.log(`All players are ready in room ${room}. Starting game.`);
            io.to(room).emit('all players ready'); // Emit all players ready to the room
        } else if (roomSize < 2) { // If there are less than 2 users in the room
            console.log(`Not enough players in room ${room}. Waiting for more players.`); // Log that there are not enough players
        };
    });

    // For testing purposes, makes all players ready even if there aren't enough players which allows you to start the game
    // Delete this when there is no longer a need for testing
    socket.on('test start game', function (room, callback) {
        console.log(`Test start game in room ${room}.`);
        io.to(room).emit('all players ready');
    });

    // When user leaves a room - to all others
    socket.on('leaveRoom', () => {
        console.log('leaveRoom test');

        const user = getUser(socket.id); // Get the user
        userLeavesApp(socket.id); // Remove the user from the users array

        // Remove the user from the readyPlayers map
        readyPlayers.forEach((value, key) => {
            // Filter out the user's id from the room
            readyPlayers.set(key, value.filter(id => id !== socket.id));
        });

        // If the user exists
        if (user) {
            console.log(`# of Users in room after Leave: ${getUsersInRoom(user.room).length}`);

            // Leave the room
            socket.leave(user.room);

            // If there are no users in the room
            if (getUsersInRoom(user.room).length === 0) {
                // Delete the room
                games.delete(user.room);
                console.log('room gone');

                // Loops through the allActiveRooms array
                for (let i = 0; i < allActiveRooms.length; i++) {
                    // If the room value of user is equal to any of the array items
                    if (user.room === allActiveRooms[i]) {
                        // Removes that room from the allActiveRooms array
                        allActiveRooms.splice(allActiveRooms.indexOf(user.room), 1);
                    };
                };

                // Loops through the allActivePublicRooms array
                for (let i = 0; i < allActivePublicRooms.length; i++) {
                    // If the room value of user is equal to any of the array items
                    if (user.room === allActivePublicRooms[i]) {
                        // Removes that room from the allActivePublicRooms array
                        allActivePublicRooms.splice(allActivePublicRooms.indexOf(user.room), 1);
                    };
                };
            };

            // Emit leave room confirmation
            socket.emit('leaveRoomConfirmation');

            // Emit message to the room that the user has left
            io.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has left the room`));

            // Emit updated user list to the room
            io.to(user.room).emit('userList', {
                // Get the users in the room
                users: getUsersInRoom(user.room),
            });

            // Emit updated room list to all users
            io.emit('roomList', {
                // Get all active public rooms
                rooms: allActivePublicRooms,
            });
        };

        console.log(`User ${socket.id} disconnected`);
    });

    // When user disconnects - to all others
    socket.on('disconnect', () => {
        console.log('disconnect test');

        const user = getUser(socket.id); // Get the user
        userLeavesApp(socket.id); // Remove the user from the users array

        // Remove the user from the readyPlayers map
        readyPlayers.forEach((value, key) => {
            // Filter out the user's id from the room
            readyPlayers.set(key, value.filter(id => id !== socket.id));
        });

        // If the user exists
        if (user) {
            console.log(`# of Users in room after Disconnect: ${getUsersInRoom(user.room).length}`);

            //If there are no users in the room
            if (getUsersInRoom(user.room).length === 0) {
                // Delete the room
                games.delete(user.room);
                console.log('room gone');

                // Loops through the allActiveRooms array
                for (let i = 0; i < allActiveRooms.length; i++) {
                    // If the room value of user is equal to any of the array items
                    if (user.room === allActiveRooms[i]) {
                        // Removes that room from the allActiveRooms array
                        allActiveRooms.splice(allActiveRooms.indexOf(user.room), 1);
                    };
                };

                // Loops through the allActivePublicRooms array
                for (let i = 0; i < allActivePublicRooms.length; i++) {
                    // If the room value of user is equal to any of the array items
                    if (user.room === allActivePublicRooms[i]) {
                        // Removes that room from the allActivePublicRooms array
                        allActivePublicRooms.splice(allActivePublicRooms.indexOf(user.room), 1);
                    };
                };
            };

            // Emit message to the room that the user has left
            io.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has left the room`));

            // Emit updated user list to the room
            io.to(user.room).emit('userList', {
                // Get the users in the room
                users: getUsersInRoom(user.room)
            });

            // Emit updated room list to all users
            io.emit('roomList', {
                // Get all active public rooms
                rooms: allActivePublicRooms,
            });
        };

        console.log(`User ${socket.id} disconnected`);
    });

    // Listening for a message event
    socket.on('message', ({ name, text }) => {
        // Get the user's room
        const room = getUser(socket.id)?.room;

        // If the room exists
        if (room) {
            // Emit the message to the room
            io.to(room).emit('message', buildMsg(name, text, socket.id));
        };
    });

    // Listen for activity
    socket.on('activity', (name) => {
        // Get the user's room
        const room = getUser(socket.id)?.room;

        // If the room exists
        if (room) {
            // Emit the activity to the room
            socket.broadcast.to(room).emit('activity', name);
        };
    });
});

// Function used to build a message
function buildMsg(name, text, id) {
    // Return the message data
    return {
        name,
        text,
        id,
        time: new Intl.DateTimeFormat('default', { // Get the current time
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        }).format(new Date()), // Format the time
    };
};

// Function to activate a user
function activateUser(id, name, room) {
    // Create a user object
    const user = { id, name, room };

    // Add the user to the users array
    UsersState.setUsers([
        ...UsersState.users.filter(user => user.id !== id), // Filter out the user
        user, // Add the user
    ]);
    return user;
};

// Function to deactivate a user
function userLeavesApp(id) {
    // Remove the user from the users array
    UsersState.setUsers(
        UsersState.users.filter(user => user.id !== id) // Filter out the user
    );
};

// Function to get a user
function getUser(id) {
    // Return the user
    return UsersState.users.find(user => user.id === id);
};

// Function to get users in a room
function getUsersInRoom(room) {
    // Return the users in the room
    return UsersState.users.filter(user => user.room === room);
};