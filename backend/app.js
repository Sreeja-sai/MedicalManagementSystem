const express=require('express');
const {open}= require('sqlite');
const sqlite3=require('sqlite3');
const path=require('path');
const bcrypt=require('bcrypt');
const jwt=require('jsonwebtoken');

const cors = require("cors");

const app=express();
app.use(express.json());
app.use(cors({
  origin: 'https://medical-management-system-chi.vercel.app', // your Vercel URL
  credentials: true
}));
module.exports=app

const dbPath=path.join(__dirname,'medications.db');

let db;

const dbConnectionServer=async ()=>{
  try{
    db=await open({
      filename:dbPath,
      driver: sqlite3.Database,
    });
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server started on port ${PORT}`);
    });

  }catch(err){
    console.log(`Database Error: ${err.message}`);
    process.exit(1);
  }
}

dbConnectionServer();

// Signup API

app.post('/signup/',async(request,response)=>{
  const {name,email,password,role}=request.body;
  if(!name || !email || !password || !role){
    response.status(400).send("All fields are required");
    return;
  }
  try{
    const hashPassword=await bcrypt.hash(password,10);
    const emailCheckQuery=`SELECT * FROM users WHERE email = ?`;
    const existingUser=await db.get(emailCheckQuery,[email]);
    if(existingUser){
      response.status(401).send("Email already Exists");
      return;
    }
    const validRoles=['patient','caretaker'];
    if(!validRoles.includes(role)){
      response.status(400).send("Role must be patient or cartaker");
      return;
    }
    const dbQuery=`
    INSERT INTO users (name,email,password,role) VALUES (?, ?, ?, ?);
    `;
    const result=await db.run(dbQuery,[name,email,hashPassword,role]);
    response.json({ message: "User Added Successfully!!!" });
  }catch (error) {
  console.error("Signup failed:", error.message);
  response.status(500).send("Signup failed due to server error.");
  }
});


app.post('/login/',async(request,response)=>{
  const {email,password}=request.body;
  try{
    const getEmailQuery=`SELECT * FROM users WHERE email = ?`;
    const user=await db.get(getEmailQuery,[email]);
    if(!user){
      response.status(401).send("Email Id doesnot exists");
      return;
    }
    const isValidPassword=await bcrypt.compare(password,user.password);
    // console.log(user.password);
    
    if(isValidPassword){
      const payload={
        id:user.id,
        email:user.email,
        role:user.role
      };
      const jwt_token=jwt.sign(payload,"MY_SECRET_TOKEN");
      response.send({jwt_token})
    }else{
      response.status(401).send("Invalid email or password");
    }
  }catch(err){
    response.status(500).send(`Login Failed:${err.message}`);
  }
});


const getValidationMiddleware=(request,response,next)=>{
  let jwt_token;
  const auth=request.headers['authorization']
  if(auth!==undefined){
    jwt_token=auth.split(" ")[1];
  }
  if(jwt_token===undefined){
    response.status(401).send("Invalid JWT TOKEN");
    return;
  }else{
    jwt.verify(jwt_token,'MY_SECRET_TOKEN',(err,payload)=>{
      if(err){
        response.status(401).send("Invalid JWT TOKEN");
        return;
      }else{
        request.user = {
          id: payload.id,
          email: payload.email,
          role: payload.role
        };
        next();
      }
    })
  }
}

// Add New Mediction as patient or caretaker

app.post('/medications/',getValidationMiddleware,async (request,response)=>{
  console.log("Posttttttttttttttttttt");
  const {name,dosage,frequency,patientId}=request.body;
  console.log(name);
  console.log(dosage);
  console.log(frequency);
  const userId=request.user.id;
  // const mailId=request.user.email;
  const role=request.user.role;
  // console.log(role);
  if(!name || !dosage || !frequency){
    return response.status(400).send("All fields required for creating new medication");
  }
  try{
    const findMedicationQuery=`SELECT id FROM medications WHERE name=? AND dosage=? AND frequency=?; `;
    const existingMedication=await db.get(findMedicationQuery,[name,dosage,frequency]);
    console.log(existingMedication);
    let medicationId;
    if(existingMedication){
      console.log("In If");
      medicationId=existingMedication.id;
    }else{
      console.log("In Else");
    const insertQuery=`
    INSERT INTO medications (name,dosage,frequency) VALUES (?, ?, ?);
    `;
    const result =await db.run(insertQuery,[name,dosage,frequency]);
    medicationId=result.lastID;
    }
    const today = new Date().toISOString().split("T")[0];

    if(role==='patient'){
      const checkDuplicateQuery = `
        SELECT * FROM user_medications 
        WHERE patient_id = ? AND medication_id = ?;
      `;
      const existingAssignment = await db.get(checkDuplicateQuery, [userId, medicationId]);

      if (existingAssignment) {
        return response.status(400).send("This medication is already assigned to the patient.");
      }
      const patientMedQuery=`
      INSERT INTO user_medications (patient_id,medication_id,caretaker_id,start_date) VALUES (?,?,NULL,?);
      `;
      const dbResponse=await db.run(patientMedQuery,[userId,medicationId,today]);
      const getallmedicationQuery=`SELECT 
          medications.name AS medication_name,
          medications.dosage AS medication_dosage,
          medications.frequency AS medication_frequency,
          user_medications.start_date AS start_date,
          COALESCE(caretakers.name, 'Self') AS caretaker_name
          FROM user_medications
          JOIN medications ON user_medications.medication_id = medications.id
          LEFT JOIN users AS caretakers ON user_medications.caretaker_id = caretakers.id
          WHERE user_medications.patient_id = ?;`;
      const allmedicationOfcaretaker=await db.all(getallmedicationQuery,[userId]);
      return response.status(201).send(allmedicationOfcaretaker);
    }else if(role==='caretaker'){
      if(!patientId){
        return response.status(400).send("patientId is required when caretaker is adding a medication.");
      }
      const duplicateCheckQuery = `
        SELECT * FROM user_medications 
        WHERE patient_id = ? AND medication_id = ?;
      `;
      const exists = await db.get(duplicateCheckQuery, [patientId, medicationId]);
      if (exists) {
        return response.status(400).send("This medication is already assigned to the patient.");
      }
      const patientExistQuery=`SELECT * from users where id=? and role='patient';`;
      const patientExists=await db.get(patientExistQuery,[patientId]);
      if(!patientExists){
        return response.status(404).send("Patient Doesnot Exist");
      }
      const caretakerQuery=`INSERT INTO user_medications (patient_id,medication_id,caretaker_id,start_date) VALUES (?, ?, ?, ?);`;
      
      const dbResponse=await db.run(caretakerQuery,[patientId,medicationId,userId,today]);
      const getallmedicationQuery=`SELECT 
          medications.name AS medication_name,
          medications.dosage AS medication_dosage,
          medications.frequency AS medication_frequency,
          user_medications.start_date AS start_date,
          u.name AS patient_name
        FROM user_medications
        JOIN medications ON user_medications.medication_id = medications.id
        JOIN users u ON u.id = user_medications.patient_id
        WHERE user_medications.caretaker_id = ?;`;

      const allMedicationsOfCaretaker=await db.all(getallmedicationQuery,[userId]);
      return response.status(201).send(allMedicationsOfCaretaker);
    }else{
      return response.status(403).send("Unauthorised Role");
    }
  }catch(err){
    console.error("Medication creation error:", err.message);
    return response.status(500).send("Internal server error");
  }
});


app.get('/medications/',getValidationMiddleware,async(request,response)=>{
  const userId=request.user.id;
  const mailId=request.user.email;
  const role=request.user.role;
  console.log("Gettttttttttttttttttttttttttttttt");
  let query="";
  try{
  if(role==='patient'){
    query=`SELECT 
          user_medications.id AS id,
          medications.name AS medication_name,
          medications.dosage AS medication_dosage,
          medications.frequency AS medication_frequency,
          user_medications.start_date AS start_date,
          COALESCE(caretakers.name, 'Self') AS caretaker_name
        FROM user_medications
        JOIN medications ON user_medications.medication_id = medications.id
        LEFT JOIN users AS caretakers ON user_medications.caretaker_id = caretakers.id
        WHERE user_medications.patient_id = ?;`;
  }else if(role==='caretaker'){
    query=`SELECT 
          user_medications.id AS id,
          medications.name AS medication_name,
          medications.dosage AS medication_dosage,
          medications.frequency AS medication_frequency,
          user_medications.start_date AS start_date,
          patients.name AS patient_name
        FROM user_medications
        JOIN medications ON user_medications.medication_id = medications.id
        JOIN users AS patients ON user_medications.patient_id = patients.id
        WHERE user_medications.caretaker_id = ?;`
  }else{
    return response.status(403).send("Unauthorized role");
  }
  const medications=await db.all(query,[userId]);
  if(medications.length===0){
    return response.status(404).send("No Medications Found");
  }
  return response.status(200).send(medications);
}catch(err){
  console.error("Error fetching medications:", err.message);
    return response.status(500).send("Internal server error");
}
});


app.put('/medications/:id', getValidationMiddleware, async (request, response) => {
  const userMedicationId = request.params.id;
  const { medication_name, medication_dosage, medication_frequency } = request.body;
  const userId = request.user.id;
  const role = request.user.role;

  if (!medication_name || !medication_dosage || !medication_frequency) {
    return response.status(400).send("All fields required for updating medication");
  }

  try {
    // 1. Check if medication already exists
    const findMedicationQuery = `
      SELECT id FROM medications WHERE name = ? AND dosage = ? AND frequency = ?;
    `;
    const existingMedication = await db.get(findMedicationQuery, [
      medication_name,
      medication_dosage,
      medication_frequency,
    ]);

    let medicationId;

    if (existingMedication) {
      medicationId = existingMedication.id;
    } else {
      // 2. Create new medication entry
      const insertQuery = `
        INSERT INTO medications (name, dosage, frequency) VALUES (?, ?, ?);
      `;
      const result = await db.run(insertQuery, [
        medication_name,
        medication_dosage,
        medication_frequency,
      ]);
      medicationId = result.lastID;
    }

    // 3. Update the user_medications record with the new medication_id
    const updateUserMedicationQuery = `
      UPDATE user_medications
      SET medication_id = ?
      WHERE id = ? AND ${role === 'patient' ? 'patient_id' : 'caretaker_id'} = ?;
    `;
    const updateResult = await db.run(updateUserMedicationQuery, [medicationId, userMedicationId, userId]);

    if (updateResult.changes === 0) {
      return response.status(404).send("Medication not found or not authorized to update.");
    }

    return response.status(200).send("Medication updated successfully.");
  } catch (error) {
    console.error("Medication update error:", error.message);
    return response.status(500).send("Internal server error");
  }
});





app.delete('/medications/:medicationId/',getValidationMiddleware,async (request,response)=>{
  const userId = request.user.id;
  const role = request.user.role;
  const {medicationId}=request.params;
  console.log("Deleteeeeeeeeeeeeeeeeeeeeeeeeee");
  try{
    const checkQuery=`SELECT * FROM user_medications WHERE 
    id=? and ${role==='patient'?'patient_id':'caretaker_id'}=?;`
    const userExits=await db.get(checkQuery,[medicationId,userId]);
    if(!userExits){
      return response.status(400).send("You are not authorized to delete this medication.");
    }
    const deleteQuery=`DELETE FROM user_medications WHERE id=?;`;
    const dbResponse=await db.run(deleteQuery,[medicationId]);
    if(dbResponse.changes===0){
      return response.status(404).send("No medication found to delete.");
    }
     let getAllQuery = "";
    if (role === 'patient') {
      getAllQuery = `
        SELECT 
        user_medications.id AS id,
          medications.name AS medication_name,
          medications.dosage AS medication_dosage,
          medications.frequency AS medication_frequency,
          user_medications.start_date AS start_date,
          COALESCE(caretakers.name, 'Self') AS caretaker_name
        FROM user_medications
        JOIN medications ON user_medications.medication_id = medications.id
        LEFT JOIN users AS caretakers ON user_medications.caretaker_id = caretakers.id
        WHERE user_medications.patient_id = ?;
      `;
    } else if (role === 'caretaker') {
      getAllQuery = `
        SELECT 
          user_medications.id AS id,
          medications.name AS medication_name,
          medications.dosage AS medication_dosage,
          medications.frequency AS medication_frequency,
          user_medications.start_date AS start_date,
          patients.name AS patient_name
        FROM user_medications
        JOIN medications ON user_medications.medication_id = medications.id
        JOIN users AS patients ON user_medications.patient_id = patients.id
        WHERE user_medications.caretaker_id = ?;
      `;
    } else {
      return response.status(403).send("Unauthorized role");
    }
    const updateMedications=await db.all(getAllQuery,[userId]);
    response.status(200).send(updateMedications);
  }catch(err){
    console.error("Delete error:", err.message);
    response.status(500).send("Internal server error");
  }
});