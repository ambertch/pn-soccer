setTimeout(function() {
	// pubnub vars
	var gameChannel = "pubnub-soccer"
	,	pubkey = 'demo'
	,	subkey = 'demo';

	// game vars
	var blueTeam = 1 // blue team moves left
	,	redTeam = 2 // red team moves right
	, 	numBlueTeamPlayers = 0
	, 	numRedTeamPlayers = 0
	, 	ball = PUBNUB.$("ball")
	,   teamName = PUBNUB.$("team-name")
	,   ballDirection = PUBNUB.$("ball-direction")
	,	teamScore = PUBNUB.$("your-team-score")
	,	blueTeamPlayerCount = PUBNUB.$("blue-team-player-count")
	, 	redTeamPlayerCount = PUBNUB.$("red-team-player-count")
	, 	playerFeedback = PUBNUB.$('player-feedback')
	, 	commandInput = PUBNUB.$("command-input")
	,	command = PUBNUB.$("command")
	, 	team = _.random(1, 2)
	, 	defaultMoveDistance = 75
	, 	timeToGameStart = 4000	
	,	board = {
			width: null,
			leftEdge: null,
			rightEdge: null
		}
	, defaultCommandInterval = 2000
	, commandsPool = ["You", "probably", "haven't", "heard", "of", "them", "meggings", "Carles", "beard", "plaid", "dreamcatcher", "squid", "slow-carb", "Wes", "Anderson", "YOLO", "occupy", "single-origin", "coffee", "bespoke", "fanny", "pack", "pug", "Brooklyn", "pork", "belly", "vinyl", "banh", "mi", "+1", "fingerstache", "Tumblr", "90's", "8-bit", "cray", "keytar", "PBR&B", "banjo", "VHS", "selfies", "leggings", "deep", "v", "ugh", "mixtape", "whatever", "Selvage", "retro", "forage", "Banksy", "trust", "fund", "cardigan", "sartorial", "paleo", "semiotics", "art", "party", "tattooed", "Stumptown", "distillery", "Pinterest", "photo", "booth", "mlkshk", "four", "loko", "Bushwick", "authentic", "chia", "sriracha", "sustainable", "scenester", "lomo", "Tonx", "selvage", "Squid", "twee", "locavore", "roof", "pop-up", "Austin", "post-ironic", "actually", "kogi", "brunch", "Etsy", "Thundercats", "tofu", "Irony", "Pitchfork", "Authentic", "meh", "fap", "ennui", "fashion", "axe", "Wolf", "yr", "mustache", "swag", "letterpress", "organic", "Williamsburg", "XOXO", "Shoreditch", "Brunch", "wayfarers", "Cosby", "sweater", "gentrify", "before", "they", "sold", "out", "Seitan", "food", "truck", "kitsch", "Flexitarian", "butcher", "Roof", "typewriter", "craft", "beer", "Chia", "farm-to-table", "keffiyeh", "flexitarian", "Occupy", "Blue", "Bottle", "Truffaut", "you", "wolf", "chambray", "mumblecore", "lo-fi", "messenger", "bag", "shabby", "chic", "High", "Life", "gluten-free", "DIY", "bitters", "direct", "trade", "literally", "viral", "Portland", "Quinoa", "McSweeney's", "asymmetrical", "synth", "disrupt", "narwhal", "Pug", "put", "a", "bird", "on", "it", "American", "Apparel", "readymade", "Chillwave", "cred", "hashtag", "Bicycle", "rights", "tousled", "Schlitz", "Godard", "small", "batch", "Hashtag", "PBR", "skateboard", "raw", "denim", "iPhone", "cornhole", "pour-over", "church-key", "Put", "Echo", "Park", "drinking", "vinegar", "vegan", "Intelligentsia", "seitan", "biodiesel"]

	function calculateBoardAttributes() {
		var width = PUBNUB.$('game-board').offsetWidth;
		var leftEdge = document.body.clientWidth - width;
		var rightEdge = leftEdge + PUBNUB.$('game-board').offsetWidth;
		board.width = width;
		board.leftEdge = leftEdge;
		board.rightEdge = rightEdge;
	}

	var gameOptions = {
		randomInterval: true, // player gets 750ms, 1.5s, or 2.25s to type the command
		randomMoveDistance: true // on every move a 1-4x multiplier is applied to baseMoveDistance
	}	

	var pubnub = PUBNUB.init({
	    publish_key: pubkey,
	    subscribe_key: subkey,
	    uuid: team + "_" + _.random(1, 9999999)
 	});
 
 	pubnub.subscribe({   
	    channel: gameChannel,
	   	presence : function(m){   		
	   	}, // Presence Events Emitted
	    message : function(message){
	    	console.log('received message:')
	    	console.log(message)
	    	if(message.type === "ballmove") {
	    		moveBall(message.value)
	    	} else if (message.type === "goal") {
	    		updateScore(message);
	    	}
	    },
	    connect : function(m) {
	    	// polling for presence, since a disconnect event is not fired upon exiting the game
	    	setInterval(function() {
	    		pubnub.here_now({
	    		channel : gameChannel,
	    		callback : function(presenceData) {
	    			// console.log(presenceData.uuids)
	    			numBlueTeamPlayers = 0;
	    			numRedTeamPlayers = 0;
	    			_(presenceData.uuids).each(function(uuid) {
	    				parseInt(uuid.substring(0,1)) === blueTeam ? numBlueTeamPlayers += 1 : numRedTeamPlayers += 1;
	    			});
	    			setTeamCounts()
	    			}
	    		});
	    	}, 2000);

    }
	});


 	function updateScore(data) { 		
 		if (data.team == team) {
 			var score = parseInt(teamScore.innerHTML);
 			teamScore.innerText = score + 1;
 		}
 	}

	function assignTeam() {
		teamName.innerText = (team === blueTeam ? "BLUE" : "RED");
		ballDirection.innerText = (team === blueTeam ? "left" : "right");
		if (team === blueTeam) {
			teamName.className = "blue";
		} else {
			teamName.className = "red";
		}
	}	

	function setTeamCounts() {
		blueTeamPlayerCount.innerText = numBlueTeamPlayers;
		redTeamPlayerCount.innerText = numRedTeamPlayers;		
	}

	function moveBall(value) {
		var newPos = parseInt(ball.offsetWidth) + value
		PUBNUB.css(ball, { left: newPos })		
		detectGoal(newPos);
	}

	function detectGoal(newPosition) {
		var ballPosition = newPosition + board.leftEdge;		
		if (ballPosition > board.rightEdge) {
			scoreGoal("right");
		} else if (ballPosition < board.leftEdge) {
			scoreGoal("left");
		}
	}

	function scoreGoal(edge) {
		// player's team scored
		if ((edge === "right" && team === redTeam) || (edge === "left" && team === blueTeam)) {
			pubnub.publish({
				channel: gameChannel,
				message: {
					type: "goal",
					team: team				
				}
			})
			playerFeedback.innerText = "SCORE!!!";
		// opposing team scored
		} else {
			pubnub.publish({
				channel: gameChannel,
				message: {
					type: "goal",
					team: (team === blueTeam ? redTeam : blueTeam)
				}
			})
			playerFeedback.innerText = "OPPOSING TEAM SCORED!";
		}

		// reset game		
		placeBall();
	}

	function calculateMoveDistance() {
		if (gameOptions.randomMoveDistance) {
			var multiplier = _.random(1, 4) 
			return defaultMoveDistance * multiplier;
		} else {
			return defaultMoveDistance;	
		}		
	}

	
	function placeBall() {
		ball.style.left = (board.width / 2) - (ball.offsetWidth / 2)		
	}

	function displayCommand() {
		var commandIndex = _.random(0, commandsPool.length - 1);
		PUBNUB.$('command').textContent = (commandsPool[commandIndex]);
		setTimeout(function() {
			displayCommand();
		}, intervalBetweenCommands())
	}

	function intervalBetweenCommands() {
		if (gameOptions.randomInterval) {
			var multiplier = _.random(1, 3)
			return multiplier * 850;	
		} else {
			return defaultCommandInterval;
		}		
	}

	function getMoveDistance(status) {		
		var moveDistance;
		if (team === blueTeam) {			
			moveDistance = status.success ? 0-calculateMoveDistance() : 0+calculateMoveDistance();
		} else {
			moveDistance = status.success ? 0+calculateMoveDistance() : 0-calculateMoveDistance();		
		}
		return moveDistance;
	}

	function successMove() {		
		playerFeedback.innerText = "Success!"
		broadcastMove(getMoveDistance({ success: true }))
	}

	function unsuccessfulMove() {		
		playerFeedback.innerText = "Try again :)"
		broadcastMove(getMoveDistance({ success: false }))
	}

	function broadcastMove(moveDistance) {		
		pubnub.publish({
			channel: gameChannel,
			message: {
				type: "ballmove",
				value: moveDistance
			}
		})
	}

	function initGameAndEvents() {			
		PUBNUB.bind('keyup', commandInput, function(e) {
			if((e.keyCode || e.charCode) === 13) {
				(commandInput.value === command.innerHTML) ? successMove() : unsuccessfulMove()
				commandInput.value = ""
			}
		});

		PUBNUB.bind('resize', window, function() { calculateBoardAttributes() })
		commandInput.focus();
	}	

	assignTeam(); 
	initGameAndEvents();	
	calculateBoardAttributes();
	placeBall();
	
	setTimeout(function() {
		displayCommand();
	}, timeToGameStart)
}, 50)