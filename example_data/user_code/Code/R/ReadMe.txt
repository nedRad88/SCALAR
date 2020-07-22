Instructions for client using R

You should have Python installed on your computer.
You can first install pip:
sudo apt-get install python-pip (if you are using Python2.x)
or
sudo apt-get install python3-pip(if you are using Python3.x)

then:

pip install grpcio
pip install grpcio-tools

********* IMPORTANT ********
Download the .proto file from the competition page and copy it in this folder.
Compile the .proto file using protoc command with output parameter set for Python.

protoc example:
python -m grpc_tools.protoc -I=. --python_out=. --grpc_python_out=. file.proto 
****************************


Install R:

sudo echo "deb http://cran.rstudio.com/bin/linux/ubuntu xenial/" | sudo tee -a /etc/apt/sources.list
gpg --keyserver keyserver.ubuntu.com --recv-key E084DAB9
gpg -a --export E084DAB9 | sudo apt-key add -
sudo apt-get update
sudo apt-get install r-base r-base-dev


Install RStudio:
You can do it from Ubuntu Software Center or:

sudo apt-get install gdebi-core
wget https://download1.rstudio.org/rstudio-0.99.896-amd64.deb
sudo gdebi -n rstudio-0.99.896-amd64.deb
rm rstudio-0.99.896-amd64.deb


Open RStudio and from console install library reticulate:

install.packages("reticulate")

Use scrtip Rclient.R to write your code.

Important: 
Script should start with calling:
library(reticulate)
use_python("path/to/python")

Enter your credentials and then edit code inside while loop to build model and send predictions.





