---
title: '`SCALAR` - A Platform for Real-time Machine Learning Competitions on Data Streams'
tags:
  - Python
  - Stream Data Mining
  - Real-time Machine Learning
  - Information Flow Processing
authors:
  - name: Nedeljko Radulovic
    affiliation: 1
  - name: Dihia Boulegane
    affiliation: "1, 2"
  - name: Albert Bifet
    affiliation: "1, 3"
affiliations:
 - name: LTCI, Télécom Paris, IP-Paris, Paris, France
   index: 1
 - name: Orange Labs, Grenoble, France
   index: 2
 - name: University of Waikato, New Zealand
   index: 3
date: 26 August 2020
output: 
  pdf_document:
    number_sections: true
    fig_caption: true
    citation_package: natbib
bibliography: references.bib

---

# Summary

`SCALAR` is a new platform for running real-time machine learning competitions on data streams.
Following the intent of Kaggle, that serves as a platform for organizing machine learning 
competitions adapted for batch learning, we propose `SCALAR` as a novel platform designed 
specifically for stream learning in real-time. `SCALAR` supports both classification and regression 
problems in the data streaming setting. It has been developed in `Python`, using state of the art 
open source solutions: `Apache Kafka`, `Apache Spark`, `gRPC`, `Protobuf`, and `Docker`. 

# Statement of need 

`SCALAR` has been inspired by existing competition platforms for batch (offline) setting 
such as: [`Kaggle`](https://www.kaggle.com/) and [`Alibaba Tianchi`](https://tianchi.aliyun.com/).

These platforms, and especially `Kaggle`, have attracted many companies, researchers and people 
working in the field of machine learning, to take part in competitions, proposing better 
solutions, and in that way, pushing forward the whole research community. We believe that 
introducing `SCALAR` will have a significant impact on the AI research community, 
especially regarding the rising interest and need for online stream data mining. 
Processing data streams is in high demand due to the fast development of IoT and many other 
real-time devices. Data are generated in real-time from a great number of various sources: sensors, 
IoT devices, social networks, applications, bank and market transactions. 
`SCALAR` supports this data stream machine learning scenario where data is continuously 
released, in batches  every time interval. 
Predictions for each current batch, that are sent before a defined deadline, 
are evaluated in real-time, and the results are shown on the live leaderboard. 

`SCALAR` has been used for organizing, a first  Real-time Machine Learning Competition on 
Data Streams[@boulegane2019real] as part of the [IEEE Big Data 2019 Cup Challenges](http://bigdataieee.org/BigData2019/BigDataCupChallenges.html).


# Mathematics

Single dollars ($) are required for inline mathematics e.g. $f(x) = e^{\pi/x}$

Double dollars make self-standing equations:

$$\Theta(x) = \left\{\begin{array}{l}
0\textrm{ if } x < 0\cr
1\textrm{ else}
\end{array}\right.$$

You can also use plain \LaTeX for equations
\begin{equation}\label{eq:fourier}
\hat f(\omega) = \int_{-\infty}^{\infty} f(x) e^{i\omega x} dx
\end{equation}
and refer to \autoref{eq:fourier} from text.

# Citations

Citations to entries in paper.bib should be in
[rMarkdown](http://rmarkdown.rstudio.com/authoring_bibliographies_and_citations.html)
format.

If you want to cite a software repository URL (e.g. something on GitHub without a preferred
citation) then you can do it with the example BibTeX entry below for @fidgit.

For a quick reference, the following citation commands can be used:
- `@author:2001`  ->  "Author et al. (2001)"
- `[@author:2001]` -> "(Author et al., 2001)"
- `[@author1:2001; @author2:2001]` -> "(Author1 et al., 2001; Author2 et al., 2002)"

# Figures

Figures can be included like this:
![Caption for example figure.\label{fig:example}](figure.png)
and referenced from text using \autoref{fig:example}.

Fenced code blocks are rendered with syntax highlighting:

# Acknowledgements

We acknowledge contributions from Brigitta Sipocz, Syrtis Major, and Semyeong
Oh, and support from Kathryn Johnston during the genesis of this project.

# References

