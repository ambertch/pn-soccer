/*
a game of single/multiplayer one dimensional soccer where the goal is to push the ball towards the opposing team's goal. 
	- a word (generated from http://hipsum.co/) is presented for the player to enter as a command
	- the word will change after a time interval
	- a correctly entered command advances the ball towards the opposing team's goal
	- an incorrectly entered command advances the ball towards your goal
*/

$(document).ready(function() {
// (function($) {

	// pubnub vars
	var gameChannel = "pubowar", pubkey = 'demo', subkey = 'demo';

	// game vars
	var blueTeam = 1; // blue team moves left
	var redTeam = 2; // red team moves right
	var numBlueTeamPlayers = 0;
	var numRedTeamPlayers = 0;
	var $ball = $("#ball");	
	var team = _.random(1, 2);
	var baseMoveDistance = 75;
	var defaultCommandInterval = 2000;	
	var commandsPool = ["You", "probably", "haven't", "heard", "of", "them", "meggings", "Carles", "beard", "plaid", "dreamcatcher", "squid", "slow-carb", "Wes", "Anderson", "YOLO", "occupy", "single-origin", "coffee", "bespoke", "fanny", "pack", "pug", "Brooklyn", "pork", "belly", "vinyl", "banh", "mi", "+1", "fingerstache", "Tumblr", "90's", "8-bit", "cray", "keytar", "PBR&B", "banjo", "VHS", "selfies", "leggings", "deep", "v", "ugh", "mixtape", "whatever", "Selvage", "retro", "forage", "Banksy", "trust", "fund", "cardigan", "sartorial", "paleo", "semiotics", "art", "party", "tattooed", "Stumptown", "distillery", "Pinterest", "photo", "booth", "mlkshk", "four", "loko", "Bushwick", "authentic", "chia", "sriracha", "sustainable", "scenester", "lomo", "Tonx", "selvage", "Squid", "twee", "locavore", "roof", "pop-up", "Austin", "post-ironic", "actually", "kogi", "brunch", "Etsy", "Thundercats", "tofu", "Irony", "Pitchfork", "Authentic", "meh", "fap", "ennui", "fashion", "axe", "Wolf", "yr", "mustache", "swag", "letterpress", "organic", "Williamsburg", "XOXO", "Shoreditch", "Brunch", "wayfarers", "Cosby", "sweater", "gentrify", "before", "they", "sold", "out", "Seitan", "food", "truck", "kitsch", "Flexitarian", "butcher", "Roof", "typewriter", "craft", "beer", "Chia", "farm-to-table", "keffiyeh", "flexitarian", "Occupy", "Blue", "Bottle", "Truffaut", "you", "wolf", "chambray", "mumblecore", "lo-fi", "messenger", "bag", "shabby", "chic", "High", "Life", "gluten-free", "DIY", "bitters", "direct", "trade", "literally", "viral", "Portland", "Quinoa", "McSweeney's", "asymmetrical", "synth", "disrupt", "narwhal", "Pug", "put", "a", "bird", "on", "it", "American", "Apparel", "readymade", "Chillwave", "cred", "hashtag", "Bicycle", "rights", "tousled", "Schlitz", "Godard", "small", "batch", "Hashtag", "PBR", "skateboard", "raw", "denim", "iPhone", "cornhole", "pour-over", "church-key", "Put", "Echo", "Park", "drinking", "vinegar", "vegan", "Intelligentsia", "seitan", "biodiesel"]

	var board = {
		width: $('#game-board').width(),
		leftEdge: $('#game-board').offset().left,
		rightEdge: $('#game-board').offset().left + $('#game-board').width()
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
 			var score = parseInt($("#your-team-score").html())
 			$("#your-team-score").html(score + 1);
 		}
 	}

	function assignTeam() {
		document.getElementById("team-name").innerHTML = (team === blueTeam ? "BLUE" : "RED");
		document.getElementById("ball-direction").innerHTML = (team === blueTeam ? "left" : "right");
		if (team === blueTeam) {
			document.getElementById("team-name").className = "blue";
		} else {
			document.getElementById("team-name").className = "red";
		}
	}	

	function setTeamCounts() {
		$("#blue-team-player-count").html(numBlueTeamPlayers);
		$("#red-team-player-count").html(numRedTeamPlayers);
	}

	function sendMoveBallMessage(success) {
	 	var moveDistance;
		if (team === blueTeam) {
			if (success) moveDistance = 0 - calculateMoveDistance();
			else moveDistance = 0 + calculateMoveDistance();
		} else {
			if (success) moveDistance = 0 + calculateMoveDistance();
			else moveDistance = 0 - calculateMoveDistance();
		}
		
		pubnub.publish({
			channel: gameChannel,
			message: {
				type: "ballmove",
				value: moveDistance
			}
		})
	}

	function moveBall(value) {
		var newPos = parseInt($ball.css("left")) + value
		$ball.css("left", newPos);
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
			$('#player-feedback').html("SCORE!!!");
		} else { // opposing team scored
			pubnub.publish({
				channel: gameChannel,
				message: {
					type: "goal",
					team: (team === blueTeam ? redTeam : blueTeam)
				}
			})
			$('#player-feedback').html("LOST!!!");
		}

		// reset game		
		placeBall();
	}

	function calculateMoveDistance() {
		if (gameOptions.randomMoveDistance) {
			var multiplier = _.random(1, 4) 
			return baseMoveDistance * multiplier;
		} else {
			return baseMoveDistance;	
		}		
	}

	function showMoveFeedback(success) {				
		if (success) {
			$('#player-feedback').html("SUCCESS! ...for now")
		} else {
			$('#player-feedback').html("you have FAILED... :)")			
		}
	}

	function placeBall() {		
		$ball.css("left", (board.width / 2) - ($ball.width()/2))		
	}

	function displayCommand() {
		var commandIndex = _.random(0, commandsPool.length - 1);
		$('.command').html(commandsPool[commandIndex]);
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

	function initGame() {
		$(".command-input").focus();
		$(".command-input").on('keyup', function(e) {
		if ((e.keyCode || e.charCode) === 13) {
			//console.log($(".command-input").val() === $(".command").html())
			if ($(".command-input").val() === $(".command").html()) {
				showMoveFeedback(true);
				sendMoveBallMessage(true);
			} else {
				showMoveFeedback(false);
				sendMoveBallMessage(false);
			}
			$(".command-input").val("");
		}
	})
	}


	assignTeam(); 
	initGame();
	placeBall();
	
	setTimeout(function() {
		displayCommand();
	}, 4000)

// })($)
});
