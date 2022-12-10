const mysql = require('mysql');
const express = require('express');
const session = require('express-session');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');

const connection = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : '',
	database : 'BankProject'
});

const app = express();

app.set("view engine", "ejs");

dotenv.config();
app.use(express.json());
app.use(cors());

app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'static')));

// http://localhost:3000/
app.get('/', function(request, response) {
    
    request.session.loggedin = false;
	response.render('pages/login');
});

// http://localhost:3000/auth
app.post('/auth', function(request, response) {
    
	let username = request.body.username;
	let password = request.body.password;
    
	if (username && password) {
        
		connection.query('SELECT * FROM auth WHERE username = ? AND password = ?', [username, password], function(error, results, fields) {

			if (error) throw error;
            
			if (results.length > 0) {
                if(results[0]['role'] === 'admin'){
				request.session.loggedin = true;
				request.session.username = username;
                
				response.redirect('/dashboard');
				}
			} else {
                response.render('pages/login');
				console.error('Incorrect Username and/or Password!');
			}			
			response.end();
		});
	} else {
		response.render('pages/login');
	}
});

// http://localhost:3000/dashboard
app.get('/dashboard', async function(request, response) {
	if (request.session.loggedin) {
		let fetchedBranches;
        	await connection.query('SELECT * FROM branch', async function(error, results, fields) {
				if (error) throw error;
				
				if (results.length > 0) {
					fetchedBranches = results
					await response.render('pages/dashboard',{
						branchData: fetchedBranches
				});
				} else {
					await response.render('pages/dashboard',{
						branchData: []
					})
				}			
				// response.end();
			});
	}
 else {
		response.render('/');
	}
});

app.get('/bank/:id', function(request,response){
	if(request.session.loggedin){
		let accountsInBranch;
		const bankid = request.params.id
		 connection.query(`SELECT c.cssn, cu.cname, b.account_number, b.balance, b.branch_id, br.branch_name FROM customer_account_access c inner join bank_account b on b.account_number = c.account_number inner join customer cu on cu.cssn = c.cssn inner join branch br on br.branch_id = b.branch_id and b.branch_id=${bankid};`,  function(error, results, fields) {
			if (error) throw error;
			
			if (results.length > 0) {
				accountsInBranch = results
				console.log(accountsInBranch)
				 response.render('pages/customers',{
					accounts: accountsInBranch
			});
			} else {
				response.render('pages/login');
				console.error('Incorrect Username and/or Password!');
			}			
			// response.end();
		});
	}
	else{
		response.render('/');
	}

})

const port = 3000;

app.listen(port, () => {
    console.log(`server is running on port ${port}`);
});