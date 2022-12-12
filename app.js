const mysql = require('mysql');
const express = require('express');
const session = require('express-session');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const { compareSync } = require('bcryptjs');

const connection = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : '',
	database : 'bank_db'
});

const app = express();
let username;
let bankBalance;

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
		connection.query('select * from auth WHERE username = ? AND password = ?', [username, password], function(error, results, fields) {
			if (error) throw error;
			if (results.length > 0) {
				//console.log(results);
                if(results[0]['role'] === 'admin'){
				request.session.loggedin = true;
				request.session.username = username;
                
				response.redirect('/dashboard');
				}
				else {
					request.session.loggedin = true;
					request.session.username = username;
					response.redirect(`/userdash/${username}`);
				}
			} else {
                response.render('pages/login');
				console.error('Incorrect Username and/or Password!');
			}
		});
	} else {
		response.render('pages/login');
	}
});

// http://localhost:3000/dashboard
app.get('/dashboard', async function(request, response) {
	if (request.session.loggedin) {
		let fetchedBranches;
        	await connection.query('select * from branch', async function(error, results, fields) {
				if (error) throw error;
				
				if (results.length > 0) {
					//console.log(results);
					fetchedBranches = results;
					await response.render('pages/dashboard',{
						branchData: fetchedBranches
				});
				}
			});
	} else {
		console.error('Failed to render dashboard');
		response.render('pages/login');
	}
});

app.get('/transaction/:account_number', async function(request, response) {
	username = request.params.username
	let accNum = request.params.account_number;
	response.render("pages/transaction",{
		account_number: accNum,
		balance: bankBalance
	})
});

app.post('/maketransaction', async function(request, response) {
	await connection.query(`select * from customer cs inner join customer_account_access ca on cs.cust_ssn = ca.cust_ssn inner join customer_transaction ct on cs.cust_ssn=ct.cust_ssn inner join bank_account ba on ca.account_number=ba.account_number and ba.account_number=${request.body.accNum};`, async function(error, results, fields) {
		if (error) throw error;
		if (results.length > 0) {
			//console.log(results);
			// console.log(request.body);
			//console.log(results);
			var transType = request.body.type;
			var transId = transType.toUpperCase() + "2022110711558774310283" + (Math.floor(Math.random()*90000) + 10000);
			var charge = 0;
			var transDate = new Date().toISOString().slice(0, 10);
			var transCode = transType.toUpperCase();
			var amount = request.body.amount;
			var today = new Date();
			var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
			var accNum = request.body.accNum;
			var ssn = results[0]['cust_ssn'];
			if(request.body.type === 'CD') {
				connection.query(`insert into customer_transaction(transaction_id, charge, transaction_date, code, amount, account_number, transaction_hour, cust_ssn) values ('${transId}', ${charge}, '${transDate}', '${transCode}', ${amount}, ${accNum}, '${time}', ${ssn});`, function(error, results, fields) {
					if (error) throw error;
					//console.log(results);
					console.log("1 transaction inserted");
				});
				connection.query(`update bank_account SET balance=balance+${amount} where account_number=${accNum};`, function(error, results, fields) {
					if (error) throw error;
					//console.log(results);
					console.log("Account balance updated(Deposit)");
				});
				response.redirect(`/userdash/${ssn}`);
			} else {
				connection.query(`select * from bank_account where account_number=${accNum};`, function(error, results, fields) {
					if (error) throw error;
					//console.log(results);
					// console.log("Balance:"+results[0]['balance']);
					var curr_balance = results[0]['balance'];
					if(curr_balance<amount) {
						console.log('Not enough balance');
						response.redirect(`/userdash/${ssn}`);
					} else {
						console.log("Withdrawal in progress");
						connection.query(`insert into customer_transaction(transaction_id, charge, transaction_date, code, amount, account_number, transaction_hour, cust_ssn) values ('${transId}', ${charge}, '${transDate}', '${transCode}', ${amount}, ${accNum}, '${time}', ${ssn});`, function(error, results, fields) {
							if (error) throw error;
							//console.log(results);
							console.log("1 transaction inserted");
						});
						connection.query(`update bank_account SET balance=balance-${amount} where account_number=${accNum};`, function(error, results, fields) {
							if (error) throw error;
							//console.log(results);
							console.log("Account balance updated(Withdraw)");
						});
						response.redirect(`/userdash/${ssn}`);
					}
				});
			}
		}
	});		
});

app.get('/userdash/:cust_ssn', async function(request, response) {
	if (request.session.loggedin) {
		let transacs;
        	await connection.query(`select * from customer cs inner join customer_account_access ca on cs.cust_ssn = ca.cust_ssn inner join customer_transaction ct on cs.cust_ssn=ct.cust_ssn inner join bank_account ba on ca.account_number=ba.account_number and cs.cust_ssn=${request.params.cust_ssn} order by ct.transaction_date desc,ct.transaction_hour desc;`, async function(error, results, fields) {
				if (error) throw error;
				
				if (results.length > 0) {
					//console.log(results);
					transacs = results;
					bankBalance=transacs[0].balance;
					await response.render('pages/usertransactions',{
						userTransacs: transacs,
						username: request.params.cust_ssn
					});
				}
			});
	} else {
		response.render('pages/login');
	}
});

app.get('/bank/:id', function(request,response){
	if(request.session.loggedin){
		let accountsInBranch;
		const bankid = request.params.id;
		connection.query(`select c.cust_ssn, cu.cust_name, b.account_number, b.balance, b.branch_id, br.branch_name from customer_account_access c inner join bank_account b on b.account_number = c.account_number inner join customer cu on cu.cust_ssn = c.cust_ssn inner join branch br on br.branch_id = b.branch_id and b.branch_id=${bankid};`,  function(error, results, fields) {
			if (error) throw error;
			
			if (results.length > 0) {
				//console.log(results);
				accountsInBranch = results;
				response.render('pages/customers',{
					accounts: accountsInBranch
			});
			} else {
				response.render('pages/login');
				console.error('Incorrect Username and/or Password!');
			}
		});
	} else{
		response.render('/');
	}

})

const port = 3000;

app.listen(port, () => {
	console.log(`server is running on port ${port}`);
});