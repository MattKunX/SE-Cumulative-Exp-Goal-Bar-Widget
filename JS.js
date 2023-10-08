let goal, levelGoal, fieldData, incentivesValues;
let botPoints = 0;
let sessionData;
let currentPoints = 0;
let currentLevel = 0;
let incentivesNames = 0;
let levelSound = 0;
let bulkTotal = 0;
let bulkCount = 0;
let pendingSave = false;
let initialUpdate = true;

window.addEventListener('onWidgetLoad', function (obj) {
    fieldData = obj.detail.fieldData;  
  	sessionData = obj["detail"]["session"]["data"];
  
  	incentivesValues = fieldData['incentivesValues'].split(',').map(Number);
  	
  	if (fieldData['incentivesNames'].length)
  		incentivesNames = fieldData['incentivesNames'].split(',');  
  
    SE_API.store.get('progress').then(p => {
       currentPoints = p.value;
       updateBar();
    });
  
  	if (fieldData["sound"].length) {
	  	levelSound = new Audio(fieldData["sound"]);
      levelSound.volume = fieldData["volume"] / 100;
    }
});

window.addEventListener('onEventReceived', function (obj) {
    const listener = obj.detail.listener;
    const event = listener.split("-")[0];
    const data = obj.detail.event;
  
    if (!data)
      return;
      	
    // Handling widget buttons
    if (data.listener === 'widget-button' && data.field === 'setProgress') {
      initialUpdate = true;
      setPoints(fieldData["pogress"]);
    }
    
  	if (listener != 'kvstore:update') {
      let bitsAmount = 0;
      let subsAmount = 0;
      let tipsAmount = 0;

      switch(event) {
        case 'subscriber':
          let tierval = 1;
          let amount = 1; //data.amount; fix for previous months counted
          
          if (data.tier && data.tier !== "prime")
            tierval = data.tier / 1000;
          
          // bulk has unreliable tier value
          if (data.bulkGifted)
            bulkTotal = data.amount;
          else
            subsAmount = amount * tierval;

          addPoints(subsAmount, fieldData.pointsPerSub);
          
          if (bulkTotal) {
            if (bulkCount < bulkTotal) {
                bulkCount++;
            } else {
              bulkCount = 0;
              bulkTotal = 0;
              saveCurrentPoints();
            }
          }
          break;
        case 'cheer':
          bitsAmount = data.amount;
          addPoints(data.amount, fieldData.pointsPerBit);
          break;
        case 'tip':
          tipsAmount = data.amount;
          addPoints(data.amount, fieldData.pointsPerTip);
          break;
      }
    }
});

function saveCurrentPoints() {
	if (!pendingSave) {	
  		SE_API.store.set('progress', currentPoints)
          .then((result) => { 
            if (!result || result.message.search('success') == -1) {
              setTimeout(processPendingSave, 10000);
              pendingSave = true;
            }
          });
    }
}

function processPendingSave() {
	pendingSave = false;
  	saveCurrentPoints();
}

function setPoints(amount) {
  	if (isNaN(amount)) {
      $('#warning').css('display','block');
    } else {
      currentPoints = amount;
      if (!bulkTotal)
	      saveCurrentPoints();
      updateBar();
    }
}

function addPoints(amount, pointsPerAmount) {
  	setPoints(currentPoints + amount * pointsPerAmount);
}

function updateBar() {
  	let level = 0;
  	let percentage = 0;
        
  	if (fieldData["useCSVgoals"] && currentPoints <= incentivesValues.reduce((a,b)=>a+b) ) {
      	let goalsPassedTotal = 0;
      	for (i=0; i < incentivesValues.length; i++) {
        	goalsPassedTotal += incentivesValues[i];
          
          	if (currentPoints < goalsPassedTotal) {
              goalsPassedTotal -= incentivesValues[i];
              level = i;
              break;
            }
        }
      	percentage = (currentPoints - goalsPassedTotal) / incentivesValues[level] * 100;
    } else {
  		levelGoal = fieldData["goal"] / fieldData["levels"];
      level = Math.floor(currentPoints / levelGoal);
	    percentage = ((currentPoints / levelGoal) - level) * 100;
    }
  
    if (level > currentLevel && !initialUpdate) {
      // delay bar reset
      level = currentLevel;
      percentage = 100;
      setTimeout(() => {
        currentLevel++;
        updateBar();
      }, 4000);
      
      $('#sprite').addClass('fadeinout');
      
      if (fieldData['showLevelUpText'])
      	$('#levelup').addClass('slideup');
      
      if (levelSound)
        levelSound.play();
    } else {
      $('#sprite').removeClass('fadeinout');
      $('#levelup').removeClass('slideup');
    }
 
  	let percentage_text = "";
  	if (!isNaN(percentage)) {
	  	percentage_text = parseFloat(percentage).toFixed(2) + '%';
	    $("#bar").css('width', Math.min(100, percentage) + "%");
    }
  
  	let points_text = "";
  	if (!isNaN(currentPoints))
	  	points_text = Math.round(currentPoints) + " Exp.";
  
  	let currentIncentive = fieldData['completedMsg'];
  	if (incentivesNames && incentivesNames[level] && incentivesNames[level].length)
      	currentIncentive = incentivesNames[level];
  
  	let info = fieldData['info'].replace('{level}', level + Number(fieldData["startatlevel1"]))
    							.replace('{points}', Math.round(currentPoints))
    							.replace('{incentive}', currentIncentive);
  	
  	$(".info").html(info);
  
  	let amount_text = "";
  	let bar_text = "";
  
  	switch (fieldData['pointDisplay']) {
      case 'separated':
        amount_text = points_text;
        bar_text = percentage_text;
        break;
      case 'combined':
        bar_text = points_text + ' ' + percentage_text;
        break;
      case 'percent_only':
        bar_text = percentage_text;
      	break;
      case 'points_only':
        bar_text = points_text;
        break;
    }

    if (amount_text)
      $('.amount').html(amount_text);
  
  	if (bar_text)
      $("#bar-text").html(bar_text);
  
  	currentLevel = level;
  	initialUpdate = false;
}
