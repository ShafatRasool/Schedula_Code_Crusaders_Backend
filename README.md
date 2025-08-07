<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

## 🧠 Project Purpose

Schedula is a backend system for managing doctor-patient appointment scheduling using NestJS, PostgreSQL, and TypeORM.

---

## 🚀 Features Implemented

- User registration with role-based profile creation
- Doctor profile management
- Doctor availability (add/view/update/delete)
- Patient profile management
- Appointment booking
- View appointments by doctor/patient
- Cancel or reschedule appointments

---

## 🧪 API Testing Instructions

### 🔐 Signup
`POST /auth/signup`

```json
{
  "name": "Dr. Raj Singh",
  "email": "raj@example.com",
  "password": "securepass123",
  "role": "doctor"
}
```
### ➡️ This will create a User and an empty Doctor profile.
`Later, update details using:`

`PATCH /doctors/:id`

```json
{
  "specialization": "Cardiology",
  "experienceYears": 12,
  "bio": "Cardio expert with 12 years of experience",
  "location": "Mumbai"
}
```
### 🔐 2. Signup – Patient
`POST /auth/signup`

```json
{
  "name": "Akshay Singh",
  "email": "akshay@example.com",
  "password": "securepass123",
  "role": "patient"
}
```
### ➡️ This will create a User and an empty Patient profile.
`Later, update details using:`

`PATCH /patients/:id`

```json
{
  "birthdate": "2001-05-14",
  "gender": "male",
  "medicalHistory": "Migraine, mild asthma"
}
```


### 📆 3. Doctor Availability Slot Management (CRUD)
`After the doctor is signed up and has their doctorId, they can perform the following:`

### ➕ Create Slot
`POST /availability`

```json
{
  "doctorId": "DOCTOR_ID_HERE",
  "dayOfWeek": "Monday",
  "startTime": "09:00:00",
  "endTime": "11:00:00"
}
```
### 📄 Get All Slots of a Doctor
`GET /availability/:doctorId`

### ✏️ Update a Slot
`PATCH /availability/:slotId`

```json
{
  "startTime": "10:00:00",
  "endTime": "12:00:00"
}
```
`You can also update dayOfWeek similarly.`

### 🗑️ Delete a Slot
`DELETE /availability/:slotId`

### Patient-side actions on Appointments

### 1. Booking an Appointment (Patient)
`➕ Endpoint`
`POST /appointments`

```json
{
  "doctorId": "DOCTOR_UUID_HERE",
  "patientId": "PATIENT_UUID_HERE",
  "date": "2025-07-20",
  "timeSlot": "10:00 AM - 10:30 AM",
  "notes": "Routine check-up"
}
``` 
- 🔁 You can get the available doctorId by calling GET /doctors or from slot responses
- 👤 You can get the patientId from your previous PATCH or GET /patients

### 🔁 2. Reschedule Appointment
`PATCH /appointments/:id`

```json
{
  "status": "rescheduled",
  "newDate": "2025-07-28",
  "newTimeSlot": "11:00 AM - 11:30 AM"
}
```

### ❌ 3. Cancel Appointment
`PATCH /appointments/:id`

```json
{
  "status": "cancelled"
}
```
### ➕ Auto-recreates a slot in the availability table with the same day/time/doctor

### 4. Get Doctors Appointment
`Get /appointments/doctor/doc:id`

### 5. Get Patient Appointment
`Get /appointments/patient/patient:id`




### ⚠️ Notes for Frontend Integration
- To keep the backend lightweight and maintain clean separation of concerns, we have intentionally not added multiple backend-side validations such as:

- Checking if a slot overlaps with an existing one

- Checking if a time is in the past

- Verifying if a doctor/patient ID exists before creation

- Preventing duplicate bookings

### Instead:

### ✅ Frontend is expected to:

- Fetch data from existing listing endpoints:

- /availability/:doctorId

- /doctors, /patients, /appointments

- Use those to show only valid, future, and non-conflicting options

- Prevent invalid actions before making API calls

### ✅ This approach keeps the backend lean and focuses on data persistence and core business logic. It can later be hardened with validation if needed.

## 👤 Author

**Shafat Rasool**  
- 💻 Backend Developer Intern – PearlThoughts  
- 📧 shafatrasool050@gmail.com  
- 🔗 [LinkedIn](https://www.linkedin.com/in/shafatrasool/)

