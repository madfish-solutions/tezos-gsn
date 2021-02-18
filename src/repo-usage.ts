import * as Repo from "./repo";

(async () => {
  // Select first
  const walletId = 3;
  const acc = await Repo.Accounts().where({ walletId }).first("id");
  if (acc) {
    console.info(acc.id);
  }

  // Select all
  const accs = await Repo.Accounts().select();
  console.info(accs);
})();
