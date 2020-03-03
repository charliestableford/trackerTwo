var map;
var db;
const dbSize = 5 * 1024 * 1024;
var baseUrl = "http://vanapi.gitsql.net";

function launchDirections(lat, long) {
  directions.navigateTo(
    lat, long 
    );
  // console.log(event);
}

function initMap() {
  // this ony gets called once 
  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: 64.128288, lng: -21.827774}, 
    zoom: 8
  });
}

var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        app.receivedEvent('deviceready');
    },
    // Update DOM on a Received Event
    receivedEvent: function(id) {
      // Let's create a database
      db = openDatabase("places", "1", "MyPlaces", dbSize);
      db.transaction(
        function(tx){
            tx.executeSql("CREATE TABLE IF NOT EXISTS " +
                    "PLACES(ID INTEGER PRIMARY KEY ASC, placeName, long, lat)");

        }
    );

    async function insertPlace(name, long='',lat=''){
      return new Promise(function(resolve, reject){
          // save our form to websql
          db.transaction(function(tx){
              tx.executeSql(`INSERT INTO places(placeName, long, lat) VALUES (?,?,?)`, [name, long, lat], (tx, res)=>{
                  console.log(res);
                  // mapping into the API
                  postPlaces(name, lat, long); 
                  resolve(res);
              });  
          });
      });    
    }
  

    async function displayPlaces(tx, results){
      return new Promise((resolve, reject) => {
        //everything lands in listview in html - why is it not outputting?
          var list = $("#listView");
          list.empty();
          console.log(results.rows);
          var len = results.rows.length, i;
          for (i = 0; i < len; i++) {
              list.append(`<li>
              <a class="navigateTo" 
              onClick="launchDirections(${results.rows.item(i).lat}, ${results.rows.item(i).long} )"
              data-id="${results.rows.item(i).ID}"
              lat=" ${results.rows.item(i).lat}"
              long=" ${results.rows.item(i).long}">
              ${results.rows.item(i).placeName}
              </a></li>`);
          }
          //binding
          $("#listView").listview("refresh");
          // $(".navigateTo").bind("tap", function(event, ui){ launchDirections(event); });
          resolve();
      });
    }
      // Bind functions
      $("#savePlace").bind("tap",  function(event, ui) { saveMyPlace(); });
      $("#loginButton").bind("tap", function(event, ui){ performLogin(); });

      function launchDirections(event) {
        directions.navigateTo(
          event.target.getAttribute('lat', ), 
          event.target.getAttribute('long', ) 
          );
        // console.log(event);
      }

      function saveMyPlace(){
        let currentPlaceName = $("#placeName").val();
        
        navigator.geolocation.getCurrentPosition(saveRecord, onError);

        function saveRecord(position){
          insertPlace(currentPlaceName, position.coords.longitude,  position.coords.latitude);
          console.log(currentPlaceName);
          $("body").pagecontainer("change", "#home");
        }
        
        async function onError(error) {
          alert('code: '    + error.code    + '\n' +
              'message: ' + error.message + '\n');
          await insertPlace(currentPlaceName, 'N/A', 'N/A');
          $("body").pagecontainer("change", "#home");
        }
      }

      // user log in info
      function performLogin(){
        data = {
            "username": $("#username").val(),
            "password": $("#password").val()
        }

        $.ajax({
            type: "POST",
            url: `${baseUrl}/auth`,
            data: JSON.stringify(data),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function(response) {
                console.log(response);
                localStorage.setItem('token', response.token);
                initialSync();
                // insertPlace(currentPlaceName, position.coords.longitude,  position.coords.latitude);
                // clouds();
                //postPlaces(); // want to run postPlaces from the post page
                // getPlaces();
                $("body").pagecontainer("change", "#home");
            },
            error: function(e) {
                alert('Error: ' + e.message);
            }
        });
    }

      $(document).ready(function() {
        $("#logout").click(function(){
            localStorage.login="false";
            localStorage.removeItem("username");
            localStorage.removeItem("password");
            window.location.href = "index.html";
        });
      });
    

    function initialSync(){
      // this sets the auth token to the local storage

      $.ajax({
        type: "GET",
        url: `${baseUrl}/places`,
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        //get token - add to header
        beforeSend: function(xhr){
          xhr.setRequestHeader('authtoken', localStorage.getItem('token'))
        },
        success: function(response) {
          //getting places - need it in html
            console.log(response);
            //this is whow we will render
            for ( var i = 0; i < response.length; i++) {
              insertPlace(response[i].placeName, response[i].longitude, response[i].latitude)
              
            };
        },
        error: function(e) {
            alert('Error: ' + e.message);
        }
        // this runs after log in to delete everything from local so that we can sync with cloud
    }).done(deleteWebSQL())
    .done(storeDatatoLocalStorage()); 
  }

  function deleteWebSQL(){
    // db.transaction(function(tx){
    //   tx.executeSql(`DELETE * FROM places`, [name, long, lat], (tx, res)=>{
    //       console.log(res);
    //       resolve(res);
    //   });
    // })
    // storeDatatoLocalStorage();
  }

  async function storeDatatoLocalStorage() {
    // async (tx, res)=>{
    //   await displayPlaces(tx, res)
    // let promise = new Promise((res, rej) => {
    //   setTimeout(function(){
    //     getPlaces();
    //   }, 1000)
    //   getPlaces();
    // });

    // let result = await promise;

    // alert(result);

  let places = await getPlaces();
  console.log("this is storeDatatoLocalStorage func");
    console.log(places);
    // loop over the places and append it to the html
    $.each(places, function(){
      // $('#listView').append(`<li><a data-item='${places.id}'>${places.placeName}</li>`);
      console.log(`${places.placeName}`);
    }
  );
  }
    

    function postPlaces(placeName, lat, long){
      // posting an initital code to the swagger API - the hard coded one so we can get a location
      data = {
          "placeName": placeName,
          "longitude": long,
          "latitude": lat
        }
      $.ajax({
        type: "POST",
        url: `${baseUrl}/places`,
        data: JSON.stringify(data),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        beforeSend: function(xhr){xhr.setRequestHeader('authtoken', localStorage.getItem('token'))},
        success: function(response) {
          // localStorage.setItem('token', response.token);
          console.log("this is postPlaces func");
            console.log(response);
        },
        error: function(e) {
            alert('Error: ' + e.message);
        }
    }); 
  }

    function getPlaces(){
      return $.ajax({
        type: "GET",
        url: `${baseUrl}/places`,
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        beforeSend: function(xhr){xhr.setRequestHeader('authtoken', localStorage.getItem('token'))},
        success: function(response) {
            console.log("this is getPlaces func");
            console.log(response);
            // return response;
        },
        error: function(e) {
            alert('Error: ' + e.message);
        }
    }); 
    }

      function onGeoSuccess(position) {
          let coords = { 
            'lat': position.coords.latitude, 
            'long': position.coords.longitude 
          };
          localStorage.setItem('currentPosition', JSON.stringify(coords));
          console.log(coords);
          
          var myLatLng = {
            lat: coords.lat, 
            lng: coords.long};

          var map = new google.maps.Map(document.getElementById('map'), {
            zoom: 20,
            center: myLatLng
          });
          
          new google.maps.Marker({
            position: myLatLng,
            map: map,
            title: 'My Location'
          });


      }

      function onGeoError(error) {
          alert('code: '    + error.code    + '\n' +
              'message: ' + error.message + '\n');
      }
    
      $(document).on( 'pagebeforeshow' , '#addplace' , function(event){
        //getting current location
        // block scoping 
        function currentLocationSuccess(position){

          let coords = { 'lat': position.coords.latitude, 'long': position.coords.longitude };
          localStorage.setItem('currentPosition', JSON.stringify(coords));
          console.log(coords);
          
          var myLatLng = {lat: coords.lat, lng: coords.long};

          var map = new google.maps.Map(document.getElementById('map'), {
            zoom: 20,
            center: myLatLng
          });
          
          new google.maps.Marker({
            position: myLatLng,
            map: map,
            title: 'My Location'
          });
        }

        function currentLocationError(){

        }
           navigator.geolocation.getCurrentPosition(currentLocationSuccess, currentLocationError);
      });

      $(document).on( 'pagebeforeshow' , '#home' , function(event){
        //once the homepage becomes availabel we want to find all the navigate to's
        // $(".navigateTo").bind("tap", function(event, ui){ launchDirections(event); });
        
        db.transaction(function(tx){
          tx.executeSql(`SELECT * FROM places`, [], async (tx, res)=>{
             await displayPlaces(tx, res)
             //forcing display places to finish what it is doing before we call it
             $(".navigateTo").bind("tap", function(event, ui){ launchDirections(event); });
          });  
      });
        

      });
    }
  }

