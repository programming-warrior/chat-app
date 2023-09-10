
    async function handleSubmit(event) {
      event.preventDefault(); 
  
      const form = $(this);
  
      // Get the input values from the form
      const username = form.find('input[name="username"]').val();
      const password = form.find('input[name="password"]').val();
      const email = form.find('input[name="email"]').val();
      let url="";
  
      const userData = {
        username: username,
        password: password,
      };

      if(email===undefined){
        url="http://localhost:4000/api/signin";
      }
      else{
        url="http://localhost:4000/api/signup";
        userData.email=email;
      }

  
      const res=await fetch(url, {
        method: 'POST', 
        headers: {
          'Content-Type': 'application/json', 
        },
        body: JSON.stringify(userData), 
      })

      if(res.status===201 || res.status===200){
        const data=await res.json();
        console.log(data);
        window.localStorage.setItem('clientId',data.id);
        window.location.href="http://localhost:4000/";
      }
  
    }
  
    $('.register-form, .login-form').on('submit', handleSubmit);

    $('.message a').click(function(){
        $('form').animate({height: "toggle", opacity: "toggle"}, "slow");
     });