const setCache = (key, data) => develop.put(key, data)
const getCache = key => develop.get(key)

const html = basic => `
<!DOCTYPE html>
<html>
<body>
<span style='font-size:100px;'>&#127955;</span>
<h1>ping pong analytics!</h1>
<p>you may have to refresh to get latest views</p>
<h1 style="text-align:left;float:left;">URL (or Path)</h1> 
<h2 style="text-align:right;float:right;">Views</h2> 
<hr style="clear:both;"/>
<ul id="log"></ul>
</body>

<script>
window.payload = ${basic}
var dict = {};
var logContainer = document.querySelector("#log");
logContainer.innerHTML = null

var populateLogs = function() {


  for (var key in window.payload) {
    if ((window.payload).hasOwnProperty(key)) {
        var path = window.payload[key].path;
        // console.log(key + " -> " + JSON.stringify(path));
        if(!path || path == '/')
        {
          path = (window.payload[key].url).split('/')[2];
        }
        dict[path] = 0;
    }
  }

  for (var key in window.payload) {
    if ((window.payload).hasOwnProperty(key)) {
        var path = window.payload[key].path;
        console.log(key + " -> " + JSON.stringify(path));
        if(!path || path == '/')
        {
          // console.log("error "+path);
          path = (window.payload[key].url).split('/')[2];
        }
        dict[path] = dict[path] + 1;
    }
  }

  console.log(dict);

}

var publishLogs = function() {
  for(key in dict){
    var el = document.createElement("div");
    var name = document.createElement("span");
    var out = key;
    if(out.indexOf('.') !== -1)
    {
      name.textContent = out+" "+dict[key];
    }
    else
    {
      name.textContent = "/"+out+" "+dict[key];
    }

    

    el.appendChild(name);
    logContainer.appendChild(el);
  }
    
}


populateLogs()
publishLogs()


</script>
</html>
`

async function log(request) {
  const ip = request.headers.get('CF-Connecting-IP')
  const cacheKey = `${Date.now()}-${ip}`
  let body = await request.text()
  let obj = JSON.parse(body)
  obj["ip"] = ip
  

  let cleanURL = (obj.url).replace(/^https?\:\/\//i, "")

  let baseDomain = cleanURL.split('/')[0]
  // return new Response('ck '+cKey+' bd '+baseDomain, {status: 200})
  let urlPath = cleanURL.split('/')[1]
  //fast as possible, no need to check if / or not
  if(!urlPath)
  {
    obj["path"] = ""
  }
  else{
    obj["path"] = urlPath
  }
  

  let stringObjCacheVal
  let objCacheVal

  let cacheVal = await getCache(baseDomain)
  
  if (!cacheVal) {
    objCacheVal = {}
  }
  else {
    objCacheVal = JSON.parse(cacheVal)
  }
  objCacheVal[cacheKey] = obj
  stringObjCacheVal = JSON.stringify(objCacheVal)

  try {
    await setCache(baseDomain, stringObjCacheVal)
    return new Response('nice', { status: 200 })
  } catch (err) {
    return new Response(err, { status: 500 })
  }
}

async function poll(request)
{
  let requestURL = new URL(request.url)
  let path = requestURL.pathname.split('/')[1]
  console.log(path)  
  try {
    let payload = await getCache(path)
    const analyticsBody = html(payload)
  return new Response(analyticsBody, {
    headers: { 'Content-Type': 'text/html' },
  })
  // return new Response(path, {status: 200})
  
  } catch(err) {
    return Response.redirect("https://sdan.io/pingpong", 301)
  }
  
}

async function handleRequest(request) {
  if (request.method === 'POST') {
    return log(request)
  } 
  if (request.method === 'PUT') {
    return new Response('treasure put', {status: 200})
  }
  else {
    try {
      // try polling
      return poll(request)

      // return new Response('hola amigo', {status: 200})
    } catch (err) {
      return Response.redirect("https://sdan.io/pingpong", 301)
    }
        // return new Response('got treasure? '+Date.now(), {status: 201})
  }
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})
