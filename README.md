<table style="width: 100%;">
  <tr>
    <td style="width: 50%; text-align: center;">
      <a href="https://qitech.com.br/">
        <img src="./img/qitech.png" alt="QI Tech" style="width: 20%; max-width: 200px;">
      </a>
    </td>
    <td style="width: 100%; text-align: center;">
      <a href="https://www.inteli.edu.br/">
        <img src="./img/logo-inteli.png" alt="Inteli - Instituto de Tecnologia e Liderança" style="width: 80%; max-width: 200px;">
      </a>
    </td>
  </tr>
</table>

# 2025-2A-T22-G103-PUBLICO
# Project: Chimera VMS
# Company: QI Tech
# Team Members:
* [Esther Hikari](esther.hikari@sou.inteli.edu.br)

# Tags
In this section, we list the main deliverables for each sprint, organized by version tags:

### Sprint 1: **(04/08/2025 - 15/08/2025)**
* Detailed scope definition and backlog refinement.
* Alignment with Product Owner and academic advisor.
* Development environment setup (Git, tools, etc.).

### Sprint 2: **(18/08/2025 - 29/08/2025)**
* Adaptation of existing scanning scripts for data collection.
* Development of parsing and data normalization routines.
* Creation of tests to ensure consistency of normalized data.

### Sprint 3: **(01/09/2025 - 12/09/2025)**
* Database configuration and implementation.
* Database schema definition and data insertion logic development.
* Unification of historical data for Machine Learning model training.

### Sprint 4: **(15/09/2025 - 26/09/2025)**
* Configuration and development of alert module for Opsgenie.
* Machine Learning model training and validation.
* ML model integration into data flow for automatic classification.

### Sprint 5: **(29/09/2025 - 10/10/2025)**
* Front-end development for data visualization, logs, and charts.
* Implementation of filters and search functionalities.
* Final validation of complete pipeline with Product Owner and advisor.

# Module 14 - PKI Authentication Implementation

## Overview
Module 14 focuses on implementing **Public Key Infrastructure (PKI) authentication** for APIs that currently lack any form of request source verification. This module addresses critical security gaps by adding cryptographic authentication using public and private key pairs.

## Sprint Structure

### Sprint 1: **(13/10/2025 - 24/10/2025)**
* Translation of Docusaurus documentation and README files to English.
* Creation of 2 base APIs to simulate communication without security.
* Documentation restructuring into Module 13 and Module 14.
* Development environment setup for PKI implementation.

### Sprint 2: **(27/10/2025 - 07/11/2025)**
* PKI infrastructure setup and certificate authority configuration.
* Core cryptographic key generation and management system.
* Redis and database configuration for PKI operations.

### Sprint 3: **(10/11/2025 - 21/11/2025)**
* Client key generation and registration system.
* Public key store implementation and validation.
* Basic PKI authentication middleware development.

### Sprint 4: **(24/11/2025 - 05/12/2025)**
* API protection implementation with PKI middleware.
* Digital signature creation and verification system.
* Client library development for PKI-authenticated requests.

### Sprint 5: **(08/12/2025 - 19/12/2025)**
* Advanced security features implementation.
* Replay attack prevention with timestamp and nonce validation.
* Production testing and security validation.
  
# Development Configuration
# License

<img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;" src="https://mirrors.creativecommons.org/presskit/icons/cc.svg?ref=chooser-v1"><img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;" src="https://mirrors.creativecommons.org/presskit/icons/by.svg?ref=chooser-v1"><p xmlns:cc="http://creativecommons.org/ns#" xmlns:dct="http://purl.org/dc/terms/">

<a property="dct:title" rel="cc:attributionURL">G1</a> by <a rel="cc:attributionURL dct:creator" property="cc:attributionName">Inteli, Esther Hikari Kimura Nunes </a> is licensed under <a href="https://creativecommons.org/licenses/by/4.0/?ref=chooser-v1" rel="license noopener noreferrer" style="display:inline-block;">Attribution 4.0 International</a>.</p>