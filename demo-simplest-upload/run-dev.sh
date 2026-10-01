#!/bin/bash

meteor reset --db
meteor npm outdated
meteor npm update --save
meteor update --all-packages

meteor --exclude-archs web.browser.legacy
