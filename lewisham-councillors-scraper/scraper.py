import csv
import time

import requests
from bs4 import BeautifulSoup


def get_wards():
    url = "https://councilmeetings.lewisham.gov.uk/mgFindMember.aspx"
    response = requests.get(url)
    soup = BeautifulSoup(response.text, 'html.parser')
    wards = {}
    for option in soup.select('select[name="WardId"] option'):
        if option['value'] and option['value'] != "0":
            wards[option.text] = option['value']
    print(wards)
    return wards

def get_councillors(ward_id, ward_name):
    print("Getting councillors for ward:", ward_name)
    url = f"https://councilmeetings.lewisham.gov.uk/mgFindMember.aspx?XXR=0&AC=WARD&WID={ward_id}"
    response = requests.get(url)
    soup = BeautifulSoup(response.text, 'html.parser')
    councillors = []
    for link in soup.select('a[href*="mgUserInfo.aspx"]'):
        councillors.append(link['href'])
    councillors = list(set(councillors))  # Deduplicate the list
    print(councillors)
    return councillors

def get_councillor_details(url):
    print("Getting details for councillor:", url)
    response = requests.get(url)
    soup = BeautifulSoup(response.text, 'html.parser')

    name = soup.select_one('span#phTitle1').text.strip()
    email = soup.select_one('a[href^="mailto:"]').text.strip()

    print(name, email)
    phone_span = soup.find('span', string='Bus. phone: ')
    phone = phone_span.find_next_sibling(string=True).strip() if phone_span else 'N/A'
    print(phone)
    details = {
        'name': name,
        'email': email,
        'phone': phone,
        'url': url
    }
    return details

def store_in_csv(data, filename='councillors.csv'):
    with open(filename, mode='w', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(["Ward", "Councillor Name", "Councillor URL", "Email", "Phone"])
        for ward, councillors in data.items():
            for councillor in councillors:
                writer.writerow([ward, councillor['name'], councillor['url'], councillor['email'], councillor['phone']])

def main():
    filename = 'councillors.csv'
    wards = get_wards()
    data = {}
    for ward, ward_id in wards.items():
        councillors = get_councillors(ward_id, ward)
        data[ward] = [get_councillor_details(f"https://councilmeetings.lewisham.gov.uk/{url}") for url in councillors]
    store_in_csv(data)
    print("Data stored in ", filename)

if __name__ == "__main__":
    main()