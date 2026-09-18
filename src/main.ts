import './style.css';
import { supabase } from './supabase';

// DOM Elements
const authScreen = document.getElementById('auth-screen') as HTMLDivElement;
const hud = document.getElementById('hud') as HTMLDivElement;
const emailInput = document.getElementById('auth-email') as HTMLInputElement;
const passwordInput = document.getElementById('auth-password') as HTMLInputElement;
const btnLogin = document.getElementById('btn-login') as HTMLButtonElement;
const btnSignup = document.getElementById('btn-signup') as HTMLButtonElement;
const authMessage = document.getElementById('auth-message') as HTMLParagraphElement;
const btnLogout = document.getElementById('btn-logout') as HTMLButtonElement;

// Initialization
async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    showHUD();
  } else {
    showAuth();
  }

  // Auth State Listener
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session) {
      showHUD();
    } else {
      showAuth();
    }
  });
}

import { initGame, game } from './game';

// UI Toggles
function showAuth() {
  authScreen.classList.remove('hidden');
  hud.classList.add('hidden');
  if (game) {
      game.scene.pause('HomeBaseScene');
      game.scene.pause('OverworldScene');
  }
}

function showHUD() {
  authScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  // Initialize or resume Phaser game
  if (!game) {
      initGame();
  } else {
      // Logic to determine which scene to resume
      const btnHome = document.getElementById('btn-view-home') as HTMLButtonElement;
      if (btnHome.classList.contains('active')) {
          game.scene.resume('HomeBaseScene');
      } else {
          game.scene.resume('OverworldScene');
      }
  }
}

// Auth Handlers
btnLogin.addEventListener('click', async () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  authMessage.textContent = 'Logging in...';

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    authMessage.textContent = error.message;
  }
});

btnSignup.addEventListener('click', async () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  authMessage.textContent = 'Signing up...';

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    authMessage.textContent = error.message;
  } else {
    authMessage.textContent = 'Check your email for the login link! (Or you might be logged in automatically if email confirmation is disabled on Supabase)';
  }
});

btnLogout.addEventListener('click', async () => {
  await supabase.auth.signOut();
});

// View Toggles
const btnViewHome = document.getElementById('btn-view-home') as HTMLButtonElement;
const btnViewOverworld = document.getElementById('btn-view-overworld') as HTMLButtonElement;
const buildMenu = document.getElementById('build-menu') as HTMLDivElement;

btnViewHome.addEventListener('click', () => {
    btnViewHome.classList.add('active');
    btnViewOverworld.classList.remove('active');
    buildMenu.classList.remove('hidden');

    if (game) {
        game.scene.stop('OverworldScene');
        game.scene.start('HomeBaseScene');
    }
});

btnViewOverworld.addEventListener('click', () => {
    btnViewOverworld.classList.add('active');
    btnViewHome.classList.remove('active');
    buildMenu.classList.add('hidden'); // Hide build menu in overworld

    if (game) {
        game.scene.stop('HomeBaseScene');
        game.scene.start('OverworldScene');
    }
});

// Run
init();
