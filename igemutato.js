var Szentiras = (function() {
	
	var config = {
		// fordítás
		forditas: 'SZIT',
		// tooltip szélesség
		tipW : 300,
		// tooltip magasság
		tipH : 200,
		// tooltip távolsága a szövegtől / képenyő szélétől
		tipD : 5,
		// tooltip megjelenítési késleltetés
		tipShow : 200,
		// tooltip elrejtési késleltetés
		tipHide : 500,
		// kizárt tagek
		excludeTags : "head,script,input,select,textarea,h1,h2,h3,a"
	},
	
	regexp = /([12](?:K(?:[io]r|rón)|Makk?|Pé?t(?:er)?|Sám|T(?:h?essz?|im))|[1-3]Já?n(?:os)?|[1-5]Móz(?:es)?|(?:Ap)Csel|A(?:gg?|bd)|Ám(?:ós)?|B(?:ár|[ií]r(?:ák)?|ölcs)|Dán|É(?:sa|zs|n(?:ek(?:ek|Én)?)?)|E(?:f(?:éz)?|szt?|z(?:s?dr?)?)|Fil(?:em)?|Gal|H(?:a[bg]|ós)|Iz|J(?:ak|á?n(?:os)?|e[lr]|o(?:el)?|ó(?:[bn]|zs|el)|[Ss]ir(?:alm?)?|úd(?:ás)?|ud(?:it)?)|K(?:iv|ol)|L(?:ev|u?k(?:ács)?)|M(?:al(?:ak)?|á?té?|(?:ár)?k|ik|Törv)|N[áe]h|(?:Ó|O)z|P(?:él|ré)d|R(?:óm|[uú]th?)|S(?:ir(?:alm?)?|ír|z?of|zám)|T(?:er|it|ób)|Z(?:ak|of|s(?:olt|id)?))(?: ?[0-9]+)(?:[;,.\- ]*[0-9]+[a-z]?)*/g,
	// API URL
	url ='http://szentiras.hu/',
	api = url + 'API/?feladat=idezet&hivatkozas=',
	
	tooltip, szoveg, igehely, linkTimeout, tipTimeout, xmlhttp, d = document, e = d.documentElement, b = d.body, excludes;
	
	function keres(node) {
		var match, next, parent, replacementNode, text;
		excludes || (excludes = config.excludeTags.split(','));
		
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
						replacementNode = csere(match);

						if (!replacementNode)
							continue;

						parent.insertBefore(d.createTextNode(RegExp.leftContext), parent.insertBefore(replacementNode, node));

						text = RegExp.rightContext;
						regexp.lastIndex = 0;
					}
					parent.replaceChild(d.createTextNode(text), node);
				}
			}
			while (node = next)
	}

	function csere(hivatkozas) {
		var a = d.createElement('a');
		a.className += ' ige-link';
		a.appendChild(d.createTextNode(hivatkozas[0]));
		a.onmouseover = function(event) {
			// ha rámutatunk egy hivatkozásra, akkor új tooltipet jelenítünk meg
			clearTimeout(linkTimeout);
			clearTimeout(tipTimeout);
			hideTooltip();
			linkTimeout = setTimeout(function() { showTooltip(event); }, config.tipShow);
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

	// http://www.html5rocks.com/en/tutorials/cors/
	function createCORSRequest(method, url) {
		var xhr = new XMLHttpRequest();
		if ("withCredentials" in xhr) {
			xhr.open(method, url, true);
		}
		else if (typeof XDomainRequest != "undefined") {
			xhr = new XDomainRequest();
			xhr.open(method, url);
		}
		else {
			xhr = null;
		}
		return xhr;
	}

	function ajax(link) {
		xmlhttp && xmlhttp.abort();
		xmlhttp = createCORSRequest('GET', api + encodeURI(link.textContent) + '&forditas=' + config.forditas);

		xmlhttp.onreadystatechange = function() {
			if (!tooltip)
				return;
			if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {
				var json = JSON.parse(xmlhttp.responseText), result = '';
				if (json && json.valasz && json.valasz.versek && json.valasz.versek.length) {
					for ( var i = 0; i < json.valasz.versek.length; i++)
						result += json.valasz.versek[i].szoveg + ' ';
					szoveg.textContent = result;
				}
				else {
					szoveg.textContent = 'A betöltés sikertelen :-(';
				}
			}
		};

		xmlhttp.send();
	}

	function showTooltip(event) {
		var a = event.target || event.srcElement,
		r = a.getBoundingClientRect(),
		offsetTop = r.top + (e.scrollTop || b.scrollTop),
		offsetLeft = r.left + (e.scrollLeft || b.scrollLeft),
		screenW = b.clientWidth || window.innerWidth,
		triggerH = a.offsetHeight;
		
		ajax(a);
		
		tooltip || (tooltip = d.createElement('div'),
				szoveg = d.createElement('div'), szoveg.className += 'szoveg', tooltip.appendChild(szoveg),
				igehely = d.createElement('div'), igehely.className += 'igehely', tooltip.appendChild(igehely)
		);

		igehely.innerHTML = '&nbsp;<a href="' + url + config.forditas + '/' + encodeURI(a.textContent.replace(/\s/g, "")) + '"><b>'+ a.textContent + '</b>&nbsp;(szentiras.hu)&nbsp;&raquo;</a>';
		szoveg.textContent = "Betöltés...";
		
		tooltip.id = "igemutato";
		// amíg a tooltipen van az egér, addig marad megjelenítve
		tooltip.onmouseover = function() { clearTimeout(tipTimeout); };
		// ha elvisszük róla az egeret, akkor elrejtjük
		tooltip.onmouseout = function() {
			clearTimeout(tipTimeout);
			tipTimeout = setTimeout(function() { hideTooltip(); }, config.tipHide);
		};

		// ha a tooltip nem lóg ki az ablak tetején, akkor az elem fölé kerül,
		// egyébként alá
		tooltip.style.top = ((r.top > config.tipH + config.tipD) ? (offsetTop - config.tipH - config.tipD) : (offsetTop + triggerH + config.tipD)) + "px";
		// ha a tooltip kilógna jobb oldalt, akkor úgy helyezzük el, hogy még
		// pont elférjen, egyébként az elem fölé
		tooltip.style.left = (((offsetLeft + config.tipW) > screenW) ? (screenW - config.tipW - config.tipD) : offsetLeft) + "px";
		tooltip.style.width = config.tipW + "px";
		tooltip.style.height = config.tipH + "px";
		szoveg.style.height = (config.tipH - 30) + "px";

		b.appendChild(tooltip);
	}
	
	function hideTooltip(){
		tooltip && (tooltip.parentNode.removeChild(tooltip), tooltip = null);
	}
	
	function setConfig(options){
		for (key in options) {
			config[key] = options[key];
		}
	}

	return {
		setConfig : setConfig,
		keres : keres
	};
})();
