/*global WildRydes _config*/

var WildRydes = window.WildRydes || {};
WildRydes.map = WildRydes.map || {};
let map;

(function rideScopeWrapper($) {
    var authToken;
    WildRydes.authToken.then(function setAuthToken(token) {
        if (token) {
            authToken = token;
        } else {
            window.location.href = '/signin.html';
        }
    }).catch(function handleTokenError(error) {
        alert(error);
        window.location.href = '/signin.html';
    });

    //  requestUnicorn
    //      make the POST request to the server
    function requestUnicorn(pickupLocation) {
        $.ajax({
            method: 'POST',
            url: _config.api.invokeUrl + '/ride',
            headers: {
                Authorization: authToken
            },
            data: JSON.stringify({
                PickupLocation: {
                    Latitude: pickupLocation.latitude,
                    Longitude: pickupLocation.longitude
                }
            }),
            contentType: 'application/json',
            success: result => completeRequest(result, pickupLocation),
            error: function ajaxError(jqXHR, textStatus, errorThrown) {
                console.error('Error requesting ride: ', textStatus, ', Details: ', errorThrown);
                console.error('Response: ', jqXHR.responseText);
                alert('An error occurred when requesting your unicorn:\n' + jqXHR.responseText);
            }
        });
    }

    //  completeRequest
    //      a Unicorn has been dispatched to your location
    function completeRequest(result, pickupLocation) {
        var unicorn;
        var pronoun;

        console.log('Response received from API: ', result);
        unicorn = result.Unicorn;
        pronoun = unicorn.Gender === 'Male' ? 'his' : 'her';
        displayUpdate(unicorn.Name + ', your ' + unicorn.Color + ' unicorn, is on ' + pronoun + ' way.', unicorn.Color);
        var message = unicorn.Name + ', your ' + unicorn.Color + ' unicorn, is on ' + pronoun + ' way.';
        speech(message);

        console.log(pickupLocation);
        //  get the local weather, find nearby restaurants, movies
        //added the getWeather app but it isn't workig properely
      
        getWeather(pickupLocation, unicorn);

        animateArrival(function animateCallback() {
            displayUpdate(unicorn.Name + ' has arrived. Giddy up!', unicorn.Color);
            WildRydes.map.unsetLocation();

            $('#request').prop('disabled', 'disabled');
            $('#request').text('Set Pickup');
        });
    }

/*
    //Color api
    function colorPalette(){
        let url = "http://colormind.io/api/";
        let data = {
            model: "default",
            input: [[44,43,44],[90,83,82],"N","N","N"]
        }

        var http = new XMLHttpRequest();

        http.onreadystatechange = function(){
            if(http.readyState == 4 && http.status == 200){
                var palette = JSON.parse(http.responseText).result;
            }
         }

         http.open("POST",url,true);
         http.send(JSON.stringify(data));
    }
*/
    //Weather api request
    function getWeather(location, unc){
        //let url = "http://api.openweathermap.org/data/2.5/forecast?id=524901&appid=bb0b408d53d58409cac90931b63873b7";
        var url = "https://api.openweathermap.org/data/2.5/onecall?lat=32&lon=-97&exclude=minutely,hourly&appid=a099a51a6362902523bbf6495a0818aa";
        let lat = location.latitude;
        let lon = location.longitude;

        
        console.log(location);
        fetch(url)

        /*
        .then(function(resp) { return resp.json() }) // Convert data to json
        .then(function(data) {
            formatWeather(data);
        })
        .catch(function() {
         // catch any errors
        });
        <h4> Date: ${Weather.daily[0].dt} </h4>
        */
        
        .then(Response => Response.json())
        .then(Weather => {

            let innerHTML ='';

            innerHTML += `<h4> Forecast: ${Weather.daily[0].weather[0].description} </h4>
            <p>High: ${Math.round(((parseFloat(Weather.daily[0].temp.max)-273.15)*1.8)+32)}&deg | Low: ${Math.round(((parseFloat(Weather.daily[0].temp.min)-273.15)*1.8)+32)}&deg </p>
            `;
            displayUpdate(innerHTML, unc.Color);
        });
        
    }

    //Format Weather data function
    function formatWeather(dat)
    {
        //Converts the data into fahrenheit
        var fahrenheit = Math.round(((parseFloat(dat.main.temp)-273.15)*1.8)+32); 

        document.getElementById('description').innerHTML = dat.weather[0].description;
	    document.getElementById('temp').innerHTML = fahrenheit + '&deg;';
	    document.getElementById('location').innerHTML = dat.name;
    }

    //Text to speech
    function speech(text_msg)
    {
        let speech = new SpeechSynthesisUtterance();
        speech.lang = "en-US";
        speech.text = text_msg;
        speech.volume = 1;
        window.speechSynthesis.speak(speech);
    }


    // Register click handler for #request button
    $(function onDocReady() {
        $('#request').click(handleRequestClick);

        WildRydes.authToken.then(function updateAuthMessage(token) {
            if (token) {
                displayUpdate('You are authenticated. Click to see your <a href="#authTokenModal" data-toggle="modal">auth token</a>.');
                $('.authToken').text(token);
            }
        });

        if (!_config.api.invokeUrl) {
            $('#noApiMessage').show();
        }

        window.navigator.geolocation
            .getCurrentPosition(setLocation);

        //  put the map behind the updates list
        document.getElementById("map").style.zIndex = "10";

        function setLocation(loc) {
            map = L.map('map').setView([loc.coords.latitude, loc.coords.longitude], 13);
            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '?? OpenStreetMap'
            }).addTo(map);

            WildRydes.map.center = {latitude: loc.coords.latitude, longitude: loc.coords.longitude};
            let b = map.getBounds();        //  TODO moved
            WildRydes.map.extent = {minLat: b._northEast.lat, minLng: b._northEast.lng,
                maxLat: b._southWest.lat, maxLng: b._southWest.lng};

            WildRydes.marker  = L.marker([loc.coords.latitude, loc.coords.longitude]).addTo(map);
            var myIcon = L.icon({
                iconUrl: 'images/unicorn-icon.png',
                iconSize: [25, 25],
                iconAnchor: [22, 24],
                shadowSize: [25, 25],
                shadowAnchor: [22, 24]
            });
            WildRydes.unicorn = L.marker([loc.coords.latitude, loc.coords.longitude], {icon: myIcon}).addTo(map);
            // WildRydes.marker.bindPopup("<b>Hello world!</b><br>I am a popup.").openPopup();

            // var popup = L.popup();
            map.on('click', onMapClick);

            function onMapClick(e) {            //  TODO move to esri.js
                WildRydes.map.selectedPoint = {longitude: e.latlng.lng, latitude: e.latlng.lat};
                if (WildRydes.marker)       WildRydes.marker.remove();
                handlePickupChanged();

                WildRydes.marker  = L.marker([e.latlng.lat, e.latlng.lng]).addTo(map);

                // popup
                //     .setLatLng(e.latlng)
                //     .setContent("You clicked the map at " + e.latlng.toString())
                //     .openOn(map);
            }
        }
    });

    //  handlePickupChanged
    //      enable the Pickup button and set text to Request Unicorn
    function handlePickupChanged() {
        var requestButton = $('#request');
        requestButton.text('Request Unicorn');
        requestButton.prop('disabled', false);
    }

    //  handleRequestClick
    //      get current request location and POST request to server
    function handleRequestClick(event) {
        var pickupLocation =  WildRydes.map.selectedPoint;

        event.preventDefault();
        requestUnicorn(pickupLocation);
    }

    //  animateArrival
    //      animate the Unicorn's arrival to the user's pickup location
    function animateArrival(callback) {
        var dest = WildRydes.map.selectedPoint;
        var origin = {};

        if (dest.latitude > WildRydes.map.center.latitude) {
            origin.latitude = WildRydes.map.extent.minLat;
        } else {
            origin.latitude = WildRydes.map.extent.maxLat;
        }

        if (dest.longitude > WildRydes.map.center.longitude) {
            origin.longitude = WildRydes.map.extent.minLng;
        } else {
            origin.longitude = WildRydes.map.extent.maxLng;
        }

        WildRydes.map.animate(origin, dest, callback);
    }


}(jQuery));

//  these functions below here are my utility functions
//      to present messages to users
//      and to particularly add some 'sizzle' to the application

//  displayUpdate
//      nice utility method to show message to user
function displayUpdate(text, color='green') {
    $('#updates').prepend($(`<li style="background-color:${color}">${text}</li>`));
}

