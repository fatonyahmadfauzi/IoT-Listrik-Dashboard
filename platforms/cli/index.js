#!/usr/bin/env node
import inquirer from "inquirer";
import chalk from "chalk";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getDatabase, ref, onValue } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyD99N-FQdkTPNnNGY-fof6ijskxg0bzARc",
  authDomain: "monitoring-listrik-719b1.firebaseapp.com",
  databaseURL:
    "https://monitoring-listrik-719b1-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "monitoring-listrik-719b1",
  storageBucket: "monitoring-listrik-719b1.firebasestorage.app",
  messagingSenderId: "115654600721",
  appId: "1:115654600721:web:6b971ee1c19be7e045a9b0",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

console.log(chalk.cyan.bold("\nIoT Listrik Dashboard CLI\n"));

async function login() {
  const { email, password } = await inquirer.prompt([
    { type: "input", name: "email", message: "Email:" },
    { type: "password", name: "password", message: "Password:" },
  ]);
  try {
    await signInWithEmailAndPassword(auth, email, password);
    console.log(chalk.green("Login berhasil!\n"));
    return true;
  } catch (e) {
    console.log(chalk.red("Login gagal:"), e.message);
    return false;
  }
}

async function main() {
  let loggedIn = false;
  while (!loggedIn) {
    loggedIn = await login();
  }
  console.log(chalk.yellow("Menunggu data realtime dari Firebase...\n"));
  const listrikRef = ref(db, "/listrik");
  onValue(listrikRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;
    console.clear();
    console.log(chalk.cyan.bold("IoT Listrik Dashboard - Data Realtime\n"));
    console.log(chalk.blue("Waktu      :"), data.timestamp || "-");
    console.log(chalk.blue("Arus (A)   :"), data.arus || "-");
    console.log(chalk.blue("Tegangan(V):"), data.tegangan || "-");
    console.log(chalk.blue("Daya (VA)  :"), data.apparent_power || "-");
    console.log(chalk.blue("Status     :"), data.status || "-");
    console.log(
      chalk.blue("Relay      :"),
      data.relay ? chalk.green("ON") : chalk.red("OFF"),
    );
  });
}

main();
