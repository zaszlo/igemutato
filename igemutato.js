var Szentiras = (function() {
	
	var config = {
		// fordítás
		forditas: 'SZIT',
		// tooltip szélesség
		tipW : 300,
		// tooltip magasság
		tipH : 200,
		// betűméret,
		fontSize: 16,
		// tooltip távolsága a szövegtől / képenyő szélétől
		tipD : 5,
		// tooltip megjelenítési késleltetés
		tipShow : 200,
		// tooltip elrejtési késleltetés
		tipHide : 500,
		// kizárt tagek
		excludeTags : "head,script,input,select,textarea,h1,h2,h3,a",
		// formázás engedélyezése
		enableFormatting : true
	},
	
	regexp = /\b(?:[12](?:K(?:[io]r|rón)|Makk?|Pé?t(?:er)?|Sám|T(?:h?essz?|im))|[1-3]Já?n(?:os)?|[1-5]Móz(?:es)?|(?:Ap)?Csel|A(?:gg?|bd)|Ám(?:ós)?|B(?:ár|[ií]r(?:ák)?|ölcs)|Dán|É(?:sa|zs|n(?:ek(?:ek|Én)?)?)|E(?:f(?:éz)?|szt?|z(?:s?dr?)?)|Fil(?:em)?|Gal|H(?:a[bg]|ós)|Iz|J(?:ak|á?n(?:os)?|e[lr]|o(?:el)?|ó(?:[bn]|zs|el)|[Ss]ir(?:alm?)?|úd(?:ás)?|ud(?:it)?)|K(?:iv|ol)|L(?:ev|u?k(?:ács)?)|M(?:al(?:ak)?|á?té?|(?:ár)?k|ik|Törv)|N[áe]h|(?:Ó|O)z|P(?:él|ré)d|R(?:óm|[uú]th?)|S(?:ir(?:alm?)?|ír|z?of|zám)|T(?:er|it|ób)|Z(?:ak|of|s(?:olt|id)?))\.?(?:\s*[0-9]{1,3}(?:[,:]\s*[0-9]{1,2}[a-z]?(?:\s*[-–—]\s*[0-9]{1,2}[a-z]?\b(?![,:]))?(?:\.\s*[0-9]{1,2}[a-z]?(?:\s*[-–—]\s*[0-9]{1,2}[a-z]?\b(?![,:]))?)*)?(?:\s*[-–—]\s*[0-9]{1,3}(?:[,:]\s*[0-9]{1,2}[a-z]?(?:\s*[-–—]\s*[0-9]{1,2}[a-z]?\b(?![,:]))?(?:\.\s*[0-9]{1,2}[a-z]?(?:\s*[-–—]\s*[0-9]{1,2}[a-z]?\b(?![,:]))?)*)?)?(?:\s*[\|;]\s*[0-9]{1,3}(?:[,:]\s*[0-9]{1,2}[a-z]?(?:\s*[-–—]\s*[0-9]{1,2}[a-z]?\b(?![,:]))?(?:\.\s*[0-9]{1,2}[a-z]?(?:\s*[-–—]\s*[0-9]{1,2}[a-z]?\b(?![,:]))?)*)?(?:\s*[-–—]\s*[0-9]{1,3}(?:[,:]\s*[0-9]{1,2}[a-z]?(?:\s*[-–—]\s*[0-9]{1,2}[a-z]?\b(?![,:]))?(?:\.\s*[0-9]{1,2}[a-z]?(?:\s*[-–—]\s*[0-9]{1,2}[a-z]?\b(?![,:]))?)*)?)?)*)\b/g,
	// API URL
	url ='http://szentiras.hu/',
	api = url + 'API/?feladat=idezet&hivatkozas=',
	// tooltip elemei
	tooltip, szoveg, igehely,
	// timeoutok
	linkTimeout, tipTimeout,
	// lekérdezések kellékei
	xmlhttp, jsonp, cache = {},
	// DOM elemek
	d = document, b = d.body,
	// kizárt elemek
	excludes,
	// facepalm
	ie8;
	
// #if EMBEDDED
	// IE8 indexof: http://stackoverflow.com/a/3629211/318508
	if (!Array.prototype.indexOf)
	{
		Array.prototype.indexOf = function(elt) {
			var len = this.length >>> 0;
			var from = 0;
			for (; from < len; from++)
			{
				if (from in this &&	this[from] === elt)
					return from;
			}
			return -1;
		};
	}
// #endif EMBEDDED
	
	// Megkeresi a hivatkozásokat az oldalban
	// (valaha ez volt a [hibás] kiindulás: http://stackoverflow.com/a/2848304/318508)
	function keres(node) {
		var match, next, parent, replacementNode, text, left;
		
		if (node = (node && node.firstChild))
			do {
				next = node.nextSibling;
				parent = node.parentNode;
				if (node.nodeType === 1 && excludes.indexOf(node.nodeName.toLowerCase()) == -1) {
					keres(node);
				}
				else if (node.nodeType === 3) {
					text = node.data;

					while (match = regexp.exec(text)) {
						left = RegExp.leftContext, text = RegExp.rightContext, replacementNode = csere(match);

						if (!replacementNode)
							continue;

						parent.insertBefore(d.createTextNode(left), parent.insertBefore(replacementNode, node));

						regexp.lastIndex = 0;
					}
					parent.replaceChild(d.createTextNode(text), node);
				}
			}
			while (node = next)
	}

	// A hivatkozásokat linkekre cseréli
	function csere(match) {
		var a = d.createElement('a'),
		hivatkozas = match[0],
		hivatkozasUrl = encodeURI(hivatkozas.replace(/\s/g, "")),
		href = url + config.forditas + '/' + hivatkozasUrl;
		
		a.className += ' ige-link';
		a.appendChild(d.createTextNode(hivatkozas));
		a.href = href;
		a.target = '_blank';
		a.onmouseover = function(event) {
			// ha rámutatunk egy hivatkozásra, akkor új tooltipet jelenítünk meg
			clearTimeout(linkTimeout);
			clearTimeout(tipTimeout);
			hideTooltip();
			linkTimeout = setTimeout(function() { showTooltip(a); }, config.tipShow);
		};
		a.onmouseout = function() {
			// ha elvisszük az egeret a hivatkozásról, akkor elrejtjük a tooltipet
			clearTimeout(linkTimeout);
			if (tooltip) {
				clearTimeout(tipTimeout);
				tipTimeout = setTimeout(function() { hideTooltip(); }, config.tipHide);
			}
		};
		return a;
	}
	
// #if !EMBEDDED
	// a beágyazott verzió JSONP-t használ
	// http://www.html5rocks.com/en/tutorials/cors/
	function createCORSRequest(method, target) {
		var xhr = new XMLHttpRequest();
		if ("withCredentials" in xhr) {
			xhr.open(method, target, true);
		}
		else if (typeof XDomainRequest != "undefined") {
			xhr = new XDomainRequest();
			xhr.open(method, target);
		}
		else {
			xhr = null;
		}
		return xhr;
	}
// #endif !EMBEDDED

	// Betölti a hivatkozott szöveget
	function fetch(ige) {	
// #if !EMBEDDED
		xmlhttp && xmlhttp.abort();
// #endif !EMBEDDED
		
		if(cache[ige]){
// #if FIREFOX
			addContent(cache[ige]);
// #endif FIREFOX
// #if !FIREFOX
			szoveg.innerHTML = cache[ige];
// #endif !FIREFOX
			return;
		}
	
		var src = api + ige + '&forditas=' + config.forditas;
// #if EMBEDDED
		// a beágyazott verzióban egyelőre JSONP-t használunk
		jsonp && (b.removeChild(jsonp), jsonp = null);
		jsonp = d.createElement('script'), b.appendChild(jsonp);
		jsonp.src = src + '&callback=Szentiras.parse';
// #endif EMBEDDED
// #if !EMBEDDED
		// a bővítményekben lehet CORS
		xmlhttp = createCORSRequest('GET', src);
		xmlhttp.onreadystatechange = function() {
			if (tooltip.style.display == 'none')
				return;
			try{
				if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {
					show(JSON.parse(xmlhttp.responseText), ige);
					return;
				}
			}
			catch(ex){
				console && console.log && console.log(ex.message);
			}
			if(xmlhttp.readystate !== 0){
				szoveg.textContent = 'A betöltés sikertelen :-(';		
			}
		};

		xmlhttp.send();		
// #endif !EMBEDDED
	}
	
	function parse(json){
		show(json, null);
	}

	// Feldolgozza a JSON választ
	function show(json, ige){
		try{
			if(json && json.error){
				setText(szoveg, json.error);						
			}
			else if(json && json.valasz){
				if(json.valasz.hiba){
					setText(szoveg, json.valasz.hiba);
				}
				else if(json.valasz.versek && json.valasz.versek.length) {
// #if FIREFOX
					addContent(json.valasz.versek);
					cache[ige] = json.valasz.versek;
// #endif FIREFOX
// #if !FIREFOX
					var result = '';
					for ( var i = 0; i < json.valasz.versek.length; i++)
						result += json.valasz.versek[i].szoveg + ' ';
					if(!config.enableFormatting)
						result = result.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
					szoveg.innerHTML = result;
// #endif !FIREFOX
// #if CHROME
					// EMBEDDED esetben nem tudjuk, mi volt a kérés // TODO
					cache[ige] = result;
// #endif CHROME
					return;
				}
			}
		}
		catch(ex){
			console && console.log && console.log(ex.message);
		}
		setText(szoveg, 'A betöltés sikertelen :-(');
	}
	
// #if FIREFOX
	function addContent(versek) {
		var domParser = new DOMParser(), i, html;
				
		while(szoveg.firstChild){ szoveg.removeChild(szoveg.firstChild); }
		if(config.enableFormatting){
			for(i = 0; i < versek.length; i++){
				html = domParser.parseFromString(versek[i].szoveg, 'text/html');
				if(html.body && html.body.firstChild && html.body.firstChild.nodeName != "parserError"){
					addElements(szoveg, html.body.childNodes);
				}
			}
		}
		else{
			szoveg.textContent = '';
			for(i = 0; i < versek.length; i++){
				szoveg.textContent += (versek[i].szoveg.replace(/<[^>]+>/g, ' ') + ' ').replace(/\s+/g, ' ');
			}
		}
	}
	
	function addElements(root, nodes){
		var whitelist = /br|i|em|u|b|strong|center/i, node, next;
				
		node = nodes[0];
		do{
			next = node.nextSibling;
			if(node.nodeType == 3){
				node.textContent += ' ';
				root.appendChild(node);
			}
			else if(whitelist.test(node.nodeName)) {
				if(node.childNodes.length >0){
					addElements(node, node.childNodes);
				}
				root.appendChild(node);
			}
		}
		while(node = next);
	}
// #endif FIREFOX
	
	function setText(element, text) {
// #if EMBEDDED
		if(ie8){
			element.innerText = text;
		}
		else {
// #endif EMBEDDED
			element.textContent = text;
// #if EMBEDDED
		}
// #endif EMBEDDED
	}
	
	function createTooltip(){		
		tooltip = d.createElement('div'),
		szoveg = d.createElement('div'), szoveg.className += 'szoveg', tooltip.appendChild(szoveg),
		igehely = d.createElement('div'), igehely.className += 'igehely', tooltip.appendChild(igehely);
		
		tooltip.id = "igemutato-tooltip";
		// amíg a tooltipen van az egér, addig marad megjelenítve
		tooltip.onmouseover = function() { clearTimeout(tipTimeout); };
		// ha elvisszük róla az egeret, akkor elrejtjük
		tooltip.onmouseout = function() {
			clearTimeout(tipTimeout);
			tipTimeout = setTimeout(function() { hideTooltip(); }, config.tipHide);
		};
		
		szoveg.style.fontSize = config.fontSize + "px";
		szoveg.style.height = (config.tipH - 30) + "px";

		tooltip.style.display = 'none';
		b.appendChild(tooltip);
	}

	function calculateOffset(element){
		var offset = { top: 0, left: 0 };
		do {
			// az offsetből igazából ki kellene vonni a scrollt, de aztán a style.top-nál úgyis hozzáadnánk
			offset.left += (element.offsetLeft + element.clientLeft);
			offset.top += (element.offsetTop + element.clientTop);
		}
		while (element = element.offsetParent);
		return offset;
	}
	
	function showTooltip(a) {
		var hivatkozas = (ie8 ? a.innerText : a.textContent),
		hivatkozasUrl = encodeURI(hivatkozas.replace(/\s/g, "")),
		position = a.getBoundingClientRect(),
		offset = calculateOffset(a),		
		screenW = b.clientWidth || window.innerWidth,
		triggerH = a.offsetHeight;

// #if FIREFOX
		var link = d.createElement("a"), ref = d.createElement("b");
		link.href = a.href;
		ref.textContent = hivatkozas + ' (' + config.forditas + ')';
		link.appendChild(ref);
		 
		igehely.firstChild && igehely.removeChild(igehely.firstChild);
		igehely.appendChild(link);
// #endif FIREFOX
// #if !FIREFOX
		igehely.innerHTML = '<a href="' + a.href + '"><b>' + hivatkozas + ' (' + config.forditas + ')' + '</b></a>';
// #endif !FIREFOX
		
		setText(szoveg, "Betöltés...");

		fetch(hivatkozasUrl);

		// ha a tooltip nem lóg ki az ablak tetején, akkor az elem fölé kerül, egyébként alá
		tooltip.style.top = ((position.top > config.tipH + config.tipD) ? (offset.top - config.tipH - config.tipD) : (offset.top + triggerH + config.tipD)) + "px";
		// ha a tooltip kilógna jobb oldalt, akkor úgy helyezzük el, hogy még pont elférjen, egyébként az elem fölé
		tooltip.style.left = ((offset.left + config.tipW > screenW) ? (screenW - config.tipW - config.tipD) : offset.left) + "px";
		tooltip.style.width = config.tipW + "px";
		tooltip.style.height = config.tipH + "px";
		
		tooltip.style.display = 'block';
	}
	
	function hideTooltip(){
		tooltip.style.display = 'none';
	}
	
	function setConfig(options){
		var data = config;
		for (key in options) {
			data[key] = options[key];
		}
// #if EMBEDDED	
		// a bővítményekben már eleve van ellenőrzés
		var tipW = parseInt(data.tipW),
		tipH = parseInt(data.tipH),
		fontSize = parseInt(data.fontSize),
		tipShow = parseInt(data.tipShow),
		tipHide = parseInt(data.tipHide),
		forditas = data.forditas;

		data.tipW = (isNaN(tipW) || tipW < 100) ? config.tipW : tipW;
		data.tipH = (isNaN(tipH) || tipW < 50) ? config.tipH : tipH;
		data.fontSize = (isNaN(fontSize) || fontSize < 5) ? config.fontSize : fontSize;
		data.tipShow = (isNaN(tipShow) || tipShow < 0) ? config.tipShow : tipShow;
		data.tipHide = (isNaN(tipHide) || tipHide < 0) ? config.tipHide : tipHide;
		data.forditas = ([ 'SZIT', 'KNB', 'KG', 'UF' ].indexOf(forditas) == -1) ? config.forditas : forditas;
		data.excludeTags = data.excludeTags || config.excludeTags;
		data.enableFormatting = (data.enableFormatting === undefined) ? config.enableFormatting : (data.enableFormatting ? true : false);	
// #endif EMBEDDED
		config = data;
	}

	function start(element) {
// #if !EMBEDDED
		if(d.getElementById('igemutato-script')) return;	
// #endif !EMBEDDED
// #if EMBEDDED
		var css = d.createElement("link");
		css.setAttribute("rel", "stylesheet");
		css.setAttribute("type", "text/css");
		css.setAttribute("href", 'http://molnarm.github.io/igemutato.min.css');		
		d.getElementsByTagName("head")[0].appendChild(css);		
// #endif EMBEDDED
		// IE8: http://stackoverflow.com/a/10965073/318508
		ie8 = (window.attachEvent && !window.addEventListener);
		createTooltip();
		excludes = config.excludeTags.split(',');
		keres(element);
	}
	
	return {
		setConfig: setConfig,
		start: start,
		// ez a JSONP miatt kell
		parse: parse
	};
})();
// #if EMBEDDED
window.igemutato && window.igemutato.config && Szentiras.setConfig(window.igemutato.config);
Szentiras.start(document.body);
// #endif EMBEDDED
