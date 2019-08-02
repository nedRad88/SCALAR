# Deploy Provider App on Kubernetes

Terraform provides an easy way to define, preview, and deploy cloud infrastructure by using a [covenient templating language](https://www.terraform.io/docs/configuration/syntax.html). One of the main advantages of Terraform is presence of many [providers](https://www.terraform.io/docs/providers/) which is useful because it allows us to interact with various destination API's (Azure, VMware, Alicloud, AWS, … even GitHub and DNS) in consistent manner utilizing Terraform template language.  
To use Terraform for provisioning Azure Kubernetes Service (AKS), a couple of prerequisites must be met.
 
## Installing Terraform  

To install Terraform, download the appropriate package for your operating system and extract it into a separate install directory (e.g. c:\hashicorp\terraform.exe). The download contains a single executable file, for which you should also define a global path.
 

### Windows

Download latest version of the Terraform and place it in desired folder, followed by setting a *PATH* variable:

Check the latest version and download terraform bits:  
```
$currentVersion = $((Invoke-RestMethod -Uri https://checkpoint-api.hashicorp.com/v1/check/terraform).current_version)  
$terraformURL = "https://releases.hashicorp.com/terraform/$currentVersion/terraform_$($currentVersion)_windows_amd64.zip"  
$output = "c:\hashicorp"  
mkdir $output // if target doesn't exist yet  
(New-Object System.Net.WebClient).DownloadFile($terraformURL, "$output\terraform.zip")  
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12// if your request fails with SSL/TKS secure channel error  
Expand-Archive -Path "$output\terraform.zip" -DestinationPath $output -Force; Remove-Item "$output\terraform.zip"
```

Add PATH variable
```
$CurrentPath = (Get-Itemproperty -path 'hklm:\system\currentcontrolset\control\session manager\environment' -Name Path).Path $NewPath = $CurrentPath + ";$output" //assuming that you exctracted tf executable in the path from the previous step  
Set-ItemProperty -path 'hklm:\system\currentcontrolset\control\session manager\environment' -Name Path -Value $NewPath
```

### Linux

Download latest version of the Terraform, and extract it into /usr/local/bin

```
sudo snap install jq //if it's needed  
sudo echo ; zcat <( CURRR_VER=$(curl -s https://checkpoint-api.hashicorp.com/v1/check/terraform | jq -r -M '.current_version') ; curl -q "https://releases.hashicorp.com/terraform/$CURRR_VER/terraform_${CURRR_VER}_linux_amd64.zip" ) | sudo tee /usr/local/bin/terraform > /dev/null ; sudo chmod +x /usr/local/bin/terraform
```

Once when installation is done, verify path configuration by calling the terraform --version, and procced to the next step 


## Set up Terraform access to Azure 

To enable Terraform to provision resources into Azure, create an Azure AD service principal. The service principal grants your Terraform scripts to provision resources in your Azure subscription.  
There are many ways to create service principal. Here will be explained one that use Azure CLI 2.0 because it's easy accessible on both Windows and Linux. If anyone prefers doing this from GUI, the following [link](https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-create-service-principal-portal) provide explanation how to proceed.
 
1. [Download and install](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli?view=azure-cli-latest) Azure CLI.  
2. The Azure CLI's default authentication method uses a web browser and access token to sign in. Run the login command `az login`. If the CLI can open your default browser, it will do so and load a sign-in page. Otherwise, you need to open a browser page and follow the instructions on the command line to enter an authorization code after navigating to https://aka.ms/devicelogin in your browser. Sign in with your account credentials in the browser.  

3. Double check that you are on desired subscription `az account list --output table` (the one with **true** flag under **IsDefault** column), and if you aren't set it with `az account set --subscription "name_column"`.  
4. Create service principal `az ad sp create-for-rbac --name ServicePrincipalName --password PASSWORD`. For testing purposes, this should be enough. For more, a certificate stored in KeyVault must be provided. The output of the `create-for-rbac` command is in the following format:  
   ```
    {
	  "appId": "APP_ID",
	  "displayName": "ServicePrincipalName",
	  "name": "http://ServicePrincipalName",
	  "password": ...,
	  "tenant": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
	}
	```  
The *appId*, *tenant*, and *password* values are used for authentication, so be sure you wrote them down.


## Set up Azure storage to store Terraform state 

This step is necessary only if you want to collaborate on a terraform script with your colleagues. If you perform tests by yourself this step could be skipped.  
Terraform tracks state locally via the *terraform.tfstate* file. This pattern works well in a single-person environment. However, in a more practical multi-person environment, one need to track state on the server utilizing Azure storage. 

[Create storage account](https://code.visualstudio.com/tutorials/static-website/create-storage), and grab the access key and storage account name to run the following command:  

```
az storage container create -n <desired_container_name> --account-name <storage_account_name> --account-key <storage_access_key>
```


## Generate key pair to access worker nodes

Generate the SSH key pair to use when creating cluster. This key pair will be used to access worker nodes if it's needed.

`ssh-keygen -t rsa -b 4096`  
It will be assumed that keys are stored in *$HOME\.ssh\id_rsa.pub*. Enter the path to the key pair in *variables.tf*.


## Download the Kubectl

Kubectl is the command line interface for running commands against Kubernetes clusters. Download the [Kubectl](https://storage.googleapis.com/kubernetes-release/release/v1.9.0/bin/windows/amd64/kubectl.exe), and make sure the path of kubectl.exe is included in the [PATH Environment Variable](https://msdn.microsoft.com/en-us/library/office/ee537574(v=office.14).aspx). 


## Deploy the cluster

Now everything is set up. First we need to run `terraform init`. The **init** command downloads the required providers defined in configuration, as well as set the storage account as a backend for Terraform state.  

```
terraform init -backend-config="storage_account_name=<storage_account_name>" -backend-config="container_name=<desired_container_name>" -backend-config="access_key=<storage_access_key>" -backend-config="key=provider.tfstate"
```

We can then create a plan which defines the infrastructure elements that will be Created, Updated and Destroyed. Elements added to the plan are the difference between the current state and the current configuration.  

`terraform plan -var "client_id=<app_id>" -var "client_secret=<service_principal_password>"  -out run.plan`

If everything looks OK, let's apply the plan and create the cluster  

`terraform apply run.plan`
 
 
## Test the Kubernetes cluster 

First, we need to get the Kubernetes config. It could be done from Terraform state or via Azure CLI. Here we are using Azure CLI:  
`az aks get-credentials --resource-group <resource_group_name> --name <cluster_name>`  

This will download **config** file that will be placed in **.kube** folder inside of the user's *home* directory.  
Verify the health of the cluster.  

`kubectl get nodes`  

You should see the details of your worker nodes, and they should all have a status Ready.

Then we run `kubectl proxy` to be able to access the dashboard, and finally, the dashboard could be access via:  

`http://localhost:8001/api/v1/namespaces/kube-system/services/kubernetes-dashboard/proxy/#!/overview?namespace=default`


## Create Docker Hub secret

```
kubectl create secret docker-registry regcred --docker-server=https://index.docker.io/v1/ --docker-username=<your-name> --docker-password=<your-pword> --docker-email=<your-email>
```  
*Note: Docker email can be any properly formatted email address (e.g. fake@email.com).*

## Deploying pods

Place yourself inside the deployments folder and first deploy peristent volumes:  

```
kubectl apply -f azure-storage-class.yaml
kubectl apply -f mysql-pvc.yaml
kubectl apply -f mongo-pvc.yaml
kubectl apply -f provider-pvc.yaml
```
followed by the deployment of application services:
```
kubectl apply -f mysql-deployment.yaml
kubectl apply -f mongo-deployment.yaml
kubectl apply -f kafka-deployment.yaml
kubectl apply -f zookeeper-deployment.yaml
kubectl apply -f spark-deployment.yaml
kubectl apply -f worker-deployment.yaml
kubectl apply -f provider-deployment.yaml
```
