#!/bin/bash

meteor reset
meteor npm outdated
meteor npm update --save
meteor update --all-packages

meteor --exclude-archs web.browser.legacy
