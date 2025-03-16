import Airtable from 'airtable';
import { PrismaClient } from '@prisma/client'
import cron from 'node-cron';
import { URLSearchParams } from 'url';

const prisma = new PrismaClient()
const clientId = process.env.CLIENT_ID || '';
const clientSecret = process.env.CLIENT_SECRET || '';
const authBaseUrl = "https://hcb.hackclub.com/api/v4";
const redirectUri = "https://hackclub.com";

cron.schedule('*/110 * * * *', async () => {
    console.log('Running every 1 hour and 50 minutes:', new Date().toLocaleTimeString());
    const users = await prisma.user.findMany();
    users.forEach(async function(user) {
        const response = await fetch(`${authBaseUrl}/oauth/token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: user.refresh_token || '',
                grant_type: "refresh_token",
                redirect_uri: redirectUri,
            }),
        });
        let data = await response.json();
        console.log(data);
        await prisma.user.update({
            where: { id: user.id },
            data: {
                access_token: data.access_token,
                refresh_token: data.refresh_token,
            },
        });
    });
});

cron.schedule('*/5 * * * *', async () => {
  console.log('Running this task every 5 minutes:', new Date().toLocaleTimeString());
  const projects = await prisma.project.findMany();
  projects.forEach(async function(project) {
        const user = await prisma.user.findFirst({
            where: {
                id: project.ownerId
            },
        });
        if (user?.airtable_pat) {
            let base = new Airtable({apiKey: user.airtable_pat}).base(project.airtable_base_id);
            base(project.airtable_table).select({
                view: project.airtable_view
            }).eachPage(async function page(records, fetchNextPage) {
                records.forEach(async function(record) {
                    const isApproved = record.get(project.airtable_approval_id);
                    const isGrantSent = record.get(project.airtable_grant_id);
                    if ((isApproved || isApproved == "Approved") && !isGrantSent) {
                        console.log('Sending grant to ' + record.get('First Name'));
                        const email = record.get('Email');
                        const response = {ok: true};
                        // const response = await fetch(`${authBaseUrl}/organizations/${project.organization}/card_grants`, {
                        //     method: "POST",
                        //     headers: {
                        //         Authorization: `Bearer ${user.access_token}`,
                        //         "Content-Type": "application/json",
                        //     },
                        //     body: JSON.stringify({
                        //         email: email,
                        //         amount_cents: project.grantAmount,
                        //         merchant_lock: "",
                        //         category_lock: "",
                        //         keyword_lock: ""
                        //     }),
                        // });
                        // let data = await response.json();
                        // console.log(data);
                        record.patchUpdate({
                            [project.airtable_grant_id]: true
                        });
                        prisma.automation.create({
                            data: {
                                projectId: project.id,
                                recieverEmail: email ? email.toString() : '',
                                recieverName: record.get('First Name') + ' ' + record.get('Last Name'),
                                recieverId: record.id,
                                name: `Grant to ${record.get('First Name') + ' ' + record.get('Last Name')}`,
                                status: response.ok ? 'Success' : 'Failed',
                            }
                        })


                    }
                });
                fetchNextPage();
            }, function done(err) {
                if (err) { console.error(err); return; }
        }
        )};
  });
});

async function testRefresh() {
    const users = await prisma.user.findMany();
    users.forEach(async function(user) {
        const response = await fetch(`${authBaseUrl}/oauth/token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: user.refresh_token || '',
                grant_type: "refresh_token",
                redirect_uri: redirectUri,
            }),
        });
        let data = await response.json();
        console.log(data);
        await prisma.user.update({
            where: { id: user.id },
            data: {
                access_token: data.access_token,
                refresh_token: data.refresh_token,
            },
        });
    });
}

async function testGrant() {
    const projects = await prisma.project.findMany();
  
    for (const project of projects) {
      const user = await prisma.user.findFirst({
        where: { id: project.ownerId },
      });
  
      if (user?.airtable_pat) {
        let base = new Airtable({ apiKey: user.airtable_pat }).base(project.airtable_base_id);
  
        await new Promise((resolve, reject) => {
          base(project.airtable_table)
            .select({ view: project.airtable_view })
            .eachPage(
              async function page(records, fetchNextPage) {
                for (const record of records) {
                  const isApproved = record.get(project.airtable_approval_id);
                  const isGrantSent = record.get(project.airtable_grant_id);
  
                  if ((isApproved || isApproved == "Approved") && !isGrantSent) {
                    console.log("Sending grant to " + record.get("First Name"));
                    const email = record.get("Email");
                    const response = { ok: true };
  
                    record.patchUpdate({
                      [project.airtable_grant_id]: true,
                    });
  
                    await prisma.automation.create({
                      data: {
                        projectId: project.id,
                        recieverEmail: email ? email.toString() : "",
                        recieverName: record.get("First Name") + " " + record.get("Last Name"),
                        recieverId: record.id,
                        name: `Grant to ${record.get("First Name") + " " + record.get("Last Name")}`,
                        status: response.ok ? "Success" : "Failed",
                      },
                    });
                  }
                }
                fetchNextPage();
              });
        });
      }
    }
  }  

